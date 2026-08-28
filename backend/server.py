from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', '')
client = AsyncIOMotorClient(mongo_url) if mongo_url else None
db = client[os.environ.get('DB_NAME', 'penfight')] if client else None

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


class MatchCreate(BaseModel):
    mode: str  # 'ai' | 'local' | 'online'
    difficulty: Optional[str] = None
    winner: str  # 'p1' | 'p2'
    p1_pens_left: int = 0
    p2_pens_left: int = 0
    duration_sec: int = 0


class Match(MatchCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Room Manager for Online Multiplayer ----------
class Room:
    def __init__(self, code: str, host_ws: WebSocket):
        self.code = code
        self.p1_ws: Optional[WebSocket] = host_ws
        self.p2_ws: Optional[WebSocket] = None
        self.current_turn = "p1"
        self.created_at = datetime.now(timezone.utc)

    def is_full(self) -> bool:
        return self.p1_ws is not None and self.p2_ws is not None

    def get_opponent(self, ws: WebSocket) -> Optional[WebSocket]:
        if ws == self.p1_ws:
            return self.p2_ws
        if ws == self.p2_ws:
            return self.p1_ws
        return None

    def remove_player(self, ws: WebSocket) -> Optional[WebSocket]:
        if ws == self.p1_ws:
            self.p1_ws = None
            return self.p2_ws
        if ws == self.p2_ws:
            self.p2_ws = None
            return self.p1_ws
        return None


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def generate_code(self) -> str:
        chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        for _ in range(100):
            code = "".join(random.choices(chars, k=5))
            if code not in self.rooms:
                return code
        return str(uuid.uuid4())[:5].upper()

    def create_room(self, ws: WebSocket) -> Room:
        code = self.generate_code()
        room = Room(code, ws)
        self.rooms[code] = room
        return room

    def join_room(self, code: str, ws: WebSocket) -> tuple[Optional[Room], str]:
        code = code.strip().upper()
        if code not in self.rooms:
            return None, "Room not found. Check the code."
        room = self.rooms[code]
        if room.is_full():
            return None, "Room is full. Create a new one."
        if room.p1_ws is None:
            room.p1_ws = ws
        else:
            room.p2_ws = ws
        return room, ""

    def get_room_by_ws(self, ws: WebSocket) -> Optional[Room]:
        for room in self.rooms.values():
            if ws in (room.p1_ws, room.p2_ws):
                return room
        return None

    def remove_ws(self, ws: WebSocket) -> tuple[Optional[Room], Optional[WebSocket]]:
        for code, room in list(self.rooms.items()):
            if ws in (room.p1_ws, room.p2_ws):
                remaining = room.remove_player(ws)
                if room.p1_ws is None and room.p2_ws is None:
                    del self.rooms[code]
                return room, remaining
        return None, None


room_manager = RoomManager()


# ---------- REST Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Pen Fight API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    if db is not None:
        doc = status_obj.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if db is None:
        return []
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check.get('timestamp'), str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


@api_router.post("/matches", response_model=Match)
async def create_match(payload: MatchCreate):
    match = Match(**payload.model_dump())
    if db is not None:
        await db.matches.insert_one(match.model_dump())
    return match


@api_router.get("/matches", response_model=List[Match])
async def list_matches(limit: int = 20):
    if db is None:
        return []
    matches = await db.matches.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return matches


@api_router.get("/stats")
async def get_stats():
    if db is None:
        return {"total_games": 0, "player_wins": 0, "ai_wins": 0, "local_games": 0, "online_games": 0}
    matches = await db.matches.find({}, {"_id": 0}).to_list(10000)
    total = len(matches)
    ai_games = [m for m in matches if m.get("mode") == "ai"]
    player_wins = sum(1 for m in ai_games if m.get("winner") == "p1")
    ai_wins = sum(1 for m in ai_games if m.get("winner") == "p2")
    local_games = sum(1 for m in matches if m.get("mode") == "local")
    online_games = sum(1 for m in matches if m.get("mode") == "online")
    return {
        "total_games": total,
        "player_wins": player_wins,
        "ai_wins": ai_wins,
        "local_games": local_games,
        "online_games": online_games,
    }


# ---------- WebSocket Real-Time Multiplayer ----------
@app.websocket("/ws")
@api_router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    current_room: Optional[Room] = None
    try:
        while True:
            data = await ws.receive_json()
            msg_type = data.get("type")

            if msg_type == "CREATE_ROOM":
                current_room = room_manager.create_room(ws)
                await ws.send_json({
                    "type": "ROOM_CREATED",
                    "room_code": current_room.code,
                    "role": "p1",
                })

            elif msg_type == "JOIN_ROOM":
                code = data.get("room_code", "")
                room, err = room_manager.join_room(code, ws)
                if err or not room:
                    await ws.send_json({"type": "ERROR", "message": err})
                else:
                    current_room = room
                    # Notify both players game is ready to start
                    if room.p1_ws:
                        await room.p1_ws.send_json({
                            "type": "GAME_START",
                            "room_code": room.code,
                            "role": "p1",
                            "turn": "p1",
                        })
                    await room.p2_ws.send_json({
                        "type": "GAME_START",
                        "room_code": room.code,
                        "role": "p2",
                        "turn": "p1",
                    })

            elif msg_type == "AIM_UPDATE":
                if current_room:
                    opp = current_room.get_opponent(ws)
                    if opp:
                        await opp.send_json({
                            "type": "OPPONENT_AIM",
                            "aim": data.get("aim"),
                        })

            elif msg_type == "FLICK_PEN":
                if current_room:
                    opp = current_room.get_opponent(ws)
                    if opp:
                        await opp.send_json({
                            "type": "OPPONENT_FLICK",
                            "penId": data.get("penId"),
                            "v": data.get("v"),
                            "omega": data.get("omega"),
                            "ratio": data.get("ratio"),
                            "grab": data.get("grab"),
                        })

            elif msg_type == "SYNC_STATE":
                if current_room:
                    next_turn = data.get("turn", "p1")
                    current_room.current_turn = next_turn
                    opp = current_room.get_opponent(ws)
                    if opp:
                        await opp.send_json({
                            "type": "STATE_SYNCED",
                            "pens": data.get("pens"),
                            "turn": next_turn,
                            "p1Score": data.get("p1Score"),
                            "p2Score": data.get("p2Score"),
                        })

            elif msg_type == "REMATCH":
                if current_room:
                    current_room.current_turn = "p1"
                    if current_room.p1_ws:
                        await current_room.p1_ws.send_json({
                            "type": "REMATCH_START",
                            "role": "p1",
                            "turn": "p1",
                        })
                    if current_room.p2_ws:
                        await current_room.p2_ws.send_json({
                            "type": "REMATCH_START",
                            "role": "p2",
                            "turn": "p1",
                        })

    except WebSocketDisconnect:
        room, remaining = room_manager.remove_ws(ws)
        if remaining:
            try:
                await remaining.send_json({
                    "type": "OPPONENT_LEFT",
                    "message": "Your opponent has disconnected.",
                })
            except Exception:
                pass
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        room, remaining = room_manager.remove_ws(ws)
        if remaining:
            try:
                await remaining.send_json({
                    "type": "OPPONENT_LEFT",
                    "message": "Opponent disconnected unexpectedly.",
                })
            except Exception:
                pass


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()

