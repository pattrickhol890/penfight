from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    mode: str  # 'ai' | 'local'
    difficulty: Optional[str] = None
    winner: str  # 'p1' | 'p2'
    p1_pens_left: int = 0
    p2_pens_left: int = 0
    duration_sec: int = 0


class Match(MatchCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "Pen Fight API"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


@api_router.post("/matches", response_model=Match)
async def create_match(payload: MatchCreate):
    match = Match(**payload.model_dump())
    await db.matches.insert_one(match.model_dump())
    return match


@api_router.get("/matches", response_model=List[Match])
async def list_matches(limit: int = 20):
    matches = await db.matches.find({}, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return matches


@api_router.get("/stats")
async def get_stats():
    matches = await db.matches.find({}, {"_id": 0}).to_list(10000)
    total = len(matches)
    ai_games = [m for m in matches if m.get("mode") == "ai"]
    player_wins = sum(1 for m in ai_games if m.get("winner") == "p1")
    ai_wins = sum(1 for m in ai_games if m.get("winner") == "p2")
    local_games = sum(1 for m in matches if m.get("mode") == "local")
    return {
        "total_games": total,
        "player_wins": player_wins,
        "ai_wins": ai_wins,
        "local_games": local_games,
    }


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
    client.close()
