from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, Header, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import requests
import logging
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with short timeouts so slow/blocked connections never hang
mongo_url = os.environ.get('MONGO_URL', '')
client = None
db = None
if mongo_url:
    try:
        client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=2500,
            connectTimeoutMS=2500,
            socketTimeoutMS=2500,
        )
        db = client[os.environ.get('DB_NAME', 'penfight')]
    except Exception as e:
        logger.error(f"Failed to initialize Motor MongoDB client: {e}")

# In-memory storage fallback when MongoDB is slow, unreachable, or during Atlas IP setup
mem_users: Dict[str, dict] = {}
mem_sessions: Dict[str, dict] = {}
mem_matches: List[dict] = []
mem_status_checks: List[dict] = []

async def db_find_user(query: dict) -> Optional[dict]:
    if db is not None:
        try:
            user = await db.users.find_one(query, {"_id": 0})
            if user:
                return user
        except Exception as e:
            logger.warning(f"MongoDB find_user fallback to memory: {e}")
    for u in mem_users.values():
        if "$or" in query:
            for cond in query["$or"]:
                k, v = next(iter(cond.items()))
                if u.get(k) == v:
                    return u
        else:
            if all(u.get(k) == v for k, v in query.items()):
                return u
    return None

async def db_save_user(user_dict: dict):
    user_id = user_dict["id"]
    mem_users[user_id] = user_dict
    if db is not None:
        try:
            await db.users.update_one({"id": user_id}, {"$set": user_dict}, upsert=True)
        except Exception as e:
            logger.warning(f"MongoDB save_user fallback to memory: {e}")

async def db_update_user(user_id: str, updates: dict) -> Optional[dict]:
    if user_id in mem_users:
        mem_users[user_id].update(updates)
    if db is not None:
        try:
            await db.users.update_one({"id": user_id}, {"$set": updates})
            return await db.users.find_one({"id": user_id}, {"_id": 0})
        except Exception as e:
            logger.warning(f"MongoDB update_user fallback to memory: {e}")
    return mem_users.get(user_id)

async def db_create_session(token: str, user_id: str, now_iso: str):
    sess = {"token": token, "user_id": user_id, "created_at": now_iso}
    mem_sessions[token] = sess
    if db is not None:
        try:
            await db.sessions.insert_one(sess)
        except Exception as e:
            logger.warning(f"MongoDB create_session fallback to memory: {e}")

async def db_get_session(token: str) -> Optional[dict]:
    if db is not None:
        try:
            return await db.sessions.find_one({"token": token}, {"_id": 0})
        except Exception as e:
            logger.warning(f"MongoDB get_session fallback to memory: {e}")
    return mem_sessions.get(token)

async def db_delete_session(token: str):
    mem_sessions.pop(token, None)
    if db is not None:
        try:
            await db.sessions.delete_many({"token": token})
        except Exception as e:
            logger.warning(f"MongoDB delete_session fallback: {e}")

async def db_save_match(match_dict: dict):
    mem_matches.append(match_dict)
    if db is not None:
        try:
            await db.matches.insert_one(match_dict)
        except Exception as e:
            logger.warning(f"MongoDB save_match fallback: {e}")

async def db_list_matches(limit: int = 20) -> List[dict]:
    if db is not None:
        try:
            return await db.matches.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
        except Exception as e:
            logger.warning(f"MongoDB list_matches fallback: {e}")
    sorted_matches = sorted(mem_matches, key=lambda m: m.get("created_at", ""), reverse=True)
    return sorted_matches[:limit]

async def db_insert_status(doc: dict):
    mem_status_checks.append(doc)
    if db is not None:
        try:
            await db.status_checks.insert_one(doc)
        except Exception as e:
            logger.warning(f"MongoDB insert_status fallback: {e}")

async def db_list_status() -> List[dict]:
    if db is not None:
        try:
            return await db.status_checks.find({}, {"_id": 0}).to_list(1000)
        except Exception as e:
            logger.warning(f"MongoDB list_status fallback: {e}")
    return list(mem_status_checks)

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


class UserPreferences(BaseModel):
    favorite_ink: str = "p1"  # 'p1' (blue) or 'p2' (red)
    aim_mode: str = "forward"  # 'forward' or 'slingshot'


class UserStats(BaseModel):
    games_played: int = 0
    wins: int = 0
    losses: int = 0
    win_streak: int = 0
    best_win_streak: int = 0


class UserProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    google_id: Optional[str] = None
    email: str
    name: str
    gamer_tag: str
    picture: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    # Forward-compatible subscription fields ready for payment integration
    subscription_tier: str = "free"  # 'free' | 'pro' | 'supporter'
    subscription_status: str = "active"  # 'active' | 'inactive' | 'trial'
    subscription_expires_at: Optional[str] = None
    stats: UserStats = Field(default_factory=UserStats)
    preferences: UserPreferences = Field(default_factory=UserPreferences)


class GoogleAuthPayload(BaseModel):
    credential: Optional[str] = None
    demo_email: Optional[str] = None
    demo_name: Optional[str] = None
    demo_picture: Optional[str] = None


class ProfileUpdatePayload(BaseModel):
    gamer_tag: Optional[str] = None
    favorite_ink: Optional[str] = None
    aim_mode: Optional[str] = None


class MatchCreate(BaseModel):
    mode: str  # 'ai' | 'local' | 'online'
    difficulty: Optional[str] = None
    winner: str  # 'p1' | 'p2'
    p1_pens_left: int = 0
    p2_pens_left: int = 0
    duration_sec: int = 0
    user_id: Optional[str] = None


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
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db_insert_status(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db_list_status()
    for check in status_checks:
        if isinstance(check.get('timestamp'), str):
            try:
                check['timestamp'] = datetime.fromisoformat(check['timestamp'])
            except Exception:
                pass
    return status_checks


# ---------- Auth Helper ----------
async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1].strip()
    session = await db_get_session(token)
    if not session:
        return None
    return await db_find_user({"id": session["user_id"]})


# ---------- Auth Routes ----------
@api_router.post("/auth/google")
async def auth_google(payload: GoogleAuthPayload):
    email = None
    name = None
    google_id = None
    picture = None

    if payload.credential:
        # Verify Google ID Token via Google's tokeninfo API
        try:
            resp = requests.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={payload.credential}",
                timeout=6
            )
            if resp.status_code == 200:
                data = resp.json()
                expected_aud = os.environ.get("GOOGLE_CLIENT_ID")
                if expected_aud and data.get("aud") != expected_aud:
                    logger.warning("Google token audience mismatch")
                    raise HTTPException(status_code=401, detail="Google token audience mismatch")
                email = data.get("email")
                name = data.get("name") or (email.split("@")[0] if email else "Player")
                google_id = data.get("sub")
                picture = data.get("picture")
            else:
                logger.warning(f"Google API token verification rejected: {resp.status_code} {resp.text}")
                raise HTTPException(status_code=401, detail="Invalid Google credential token")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Google token verification error: {e}")
            raise HTTPException(status_code=401, detail="Google authentication verification failed")
    elif payload.demo_email:
        # Instant Profile Creator fallback for instant testing / dev
        email = payload.demo_email.strip().lower()
        name = payload.demo_name or email.split("@")[0]
        google_id = f"demo_{uuid.uuid4().hex[:12]}"
        picture = payload.demo_picture or f"https://api.dicebear.com/7.x/bottts/svg?seed={name}"
    else:
        raise HTTPException(status_code=400, detail="Google credential or demo_email is required")

    now_iso = datetime.now(timezone.utc).isoformat()
    
    user = None
    query_parts = []
    if google_id:
        query_parts.append({"google_id": google_id})
    if email:
        query_parts.append({"email": email})
    if query_parts:
        user = await db_find_user({"$or": query_parts})

    if user:
        # Existing user login
        updates = {"last_login_at": now_iso}
        if picture and not user.get("picture"):
            updates["picture"] = picture
        if name and not user.get("name"):
            updates["name"] = name
        user = await db_update_user(user["id"], updates)
    else:
        # New profile creation
        clean_tag = (name or "Student").replace(" ", "_")[:12]
        gamer_tag = f"{clean_tag}_{random.randint(10, 99)}"
        new_user = UserProfile(
            google_id=google_id,
            email=email or f"{gamer_tag.lower()}@penfight.local",
            name=name or "Player",
            gamer_tag=gamer_tag,
            picture=picture,
            created_at=now_iso,
            last_login_at=now_iso,
            subscription_tier="free",
            subscription_status="active",
            stats=UserStats(),
            preferences=UserPreferences(),
        )
        user = new_user.model_dump()
        await db_save_user(user)

    # Create persistent session token
    token = f"pfs_{uuid.uuid4().hex}"
    await db_create_session(token, user["id"], now_iso)

    return {"token": token, "user": user}


@api_router.get("/auth/me")
async def get_my_profile(authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return user


@api_router.put("/auth/profile")
async def update_my_profile(payload: ProfileUpdatePayload, authorization: Optional[str] = Header(None)):
    user = await get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    updates = {}
    if payload.gamer_tag:
        updates["gamer_tag"] = payload.gamer_tag.strip()[:20]

    prefs = user.get("preferences", {})
    if payload.favorite_ink:
        prefs["favorite_ink"] = payload.favorite_ink
    if payload.aim_mode:
        prefs["aim_mode"] = payload.aim_mode
    if payload.favorite_ink or payload.aim_mode:
        updates["preferences"] = prefs

    if updates:
        user = await db_update_user(user["id"], updates)
    return user


@api_router.post("/auth/logout")
async def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1].strip()
        await db_delete_session(token)
    return {"message": "Logged out successfully"}


@api_router.post("/matches", response_model=Match)
async def create_match(payload: MatchCreate, authorization: Optional[str] = Header(None)):
    match = Match(**payload.model_dump())
    match_dict = match.model_dump()
    await db_save_match(match_dict)

    # Link match result to user profile stats
    user = await get_current_user(authorization)
    if not user and payload.user_id:
        user = await db_find_user({"id": payload.user_id})

    if user:
        is_win = (payload.winner == "p1")
        stats = user.get("stats", {
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "win_streak": 0,
            "best_win_streak": 0,
        })
        stats["games_played"] = stats.get("games_played", 0) + 1
        if is_win:
            stats["wins"] = stats.get("wins", 0) + 1
            curr_streak = stats.get("win_streak", 0) + 1
            stats["win_streak"] = curr_streak
            if curr_streak > stats.get("best_win_streak", 0):
                stats["best_win_streak"] = curr_streak
        else:
            stats["losses"] = stats.get("losses", 0) + 1
            stats["win_streak"] = 0
        await db_update_user(user["id"], {"stats": stats})

    return match


@api_router.get("/matches", response_model=List[Match])
async def list_matches(limit: int = 20):
    matches = await db_list_matches(limit)
    return matches


@api_router.get("/stats")
async def get_stats():
    matches = await db_list_matches(10000)
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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error on {request.method} {request.url.path}: {exc}", exc_info=True)
    origin = request.headers.get("origin", "*")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin if origin else "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=r"^https?://.*",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()


# Serve built React frontend if available (unified full-stack deployment)
build_dir = ROOT_DIR.parent / "frontend" / "build"
if build_dir.exists():
    static_dir = build_dir / "static"
    if static_dir.exists():
        app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        target = build_dir / full_path
        if target.is_file():
            return FileResponse(str(target))
        index_file = build_dir / "index.html"
        if index_file.is_file():
            return FileResponse(str(index_file))
        raise HTTPException(status_code=404, detail="Frontend build not found")


