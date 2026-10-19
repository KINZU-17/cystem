import random
import string
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.wallet import Wallet, Transaction
from app.models.match import GameMatch, MatchPlayer
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/matches", tags=["Matchmaking & Arenas"])

class CreateMatchRequest(BaseModel):
    name: Optional[str] = "Campus Tactical Hunt"
    stake_amount_ksh: float = 130.0  # 1 Point default
    radius_meters: int = 500
    duration_seconds: int = 1800     # 30 mins
    center_lat: Optional[float] = -1.2921  # Default Nairobi CBD / Campus coords
    center_lon: Optional[float] = 36.8219

class JoinMatchRequest(BaseModel):
    code: str
    preferred_role: str = "RANDOM"  # HUNTER, RUNNER, RANDOM

def generate_room_code(db: Session) -> str:
    """Generates unique 6-character alphanumeric game code."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    for _ in range(20):
        code = "".join(random.choices(chars, k=6))
        if not db.query(GameMatch).filter(GameMatch.code == code).first():
            return code
    return "".join(random.choices(chars, k=6))

@router.post("/create")
def create_match(
    data: CreateMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hosts a new match:
    - Generates 6-character room code
    - Host defaults to RUNNER (Hider) unless changed
    - Deducts stake from host wallet into escrow pool
    """
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet or wallet.balance_ksh < data.stake_amount_ksh:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance. You need at least KSH {data.stake_amount_ksh} to host."
        )

    # Deduct stake into escrow
    wallet.balance_ksh -= data.stake_amount_ksh
    wallet.points -= (data.stake_amount_ksh / settings.POINTS_TO_KSH_RATE)

    code = generate_room_code(db)
    match = GameMatch(
        code=code,
        name=data.name,
        host_id=current_user.id,
        hider_id=current_user.id,
        status="WAITING",
        stake_amount_ksh=data.stake_amount_ksh,
        total_pool_ksh=data.stake_amount_ksh,
        radius_meters=data.radius_meters,
        duration_seconds=data.duration_seconds,
        center_lat=data.center_lat,
        center_lon=data.center_lon
    )
    db.add(match)
    db.commit()
    db.refresh(match)

    # Add host as initial player (Hider / Runner)
    player = MatchPlayer(
        match_id=match.id,
        user_id=current_user.id,
        role="RUNNER",
        ready=True
    )
    db.add(player)

    # Log escrow stake transaction
    tx = Transaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount_ksh=-data.stake_amount_ksh,
        points_delta=-(data.stake_amount_ksh / settings.POINTS_TO_KSH_RATE),
        transaction_type="STAKE",
        status="SUCCESS",
        description=f"Match #{code} Escrow Entry Stake"
    )
    db.add(tx)
    db.commit()

    return {
        "status": "success",
        "message": f"Match created with code {code}",
        "code": code,
        "match_id": match.id,
        "stake_amount_ksh": match.stake_amount_ksh,
        "total_pool_ksh": match.total_pool_ksh
    }

@router.post("/join")
def join_match(
    data: JoinMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Joins a match using a 6-character room code.
    Deducts entry stake into escrow and assigns role.
    """
    clean_code = data.code.strip().upper()
    match = db.query(GameMatch).filter(GameMatch.code == clean_code).first()
    if not match:
        raise HTTPException(status_code=404, detail="Game match with this code does not exist.")

    if match.status != "WAITING":
        raise HTTPException(status_code=400, detail="Match has already started or finished.")

    existing_player = db.query(MatchPlayer).filter(
        MatchPlayer.match_id == match.id,
        MatchPlayer.user_id == current_user.id
    ).first()
    if existing_player:
        return {
            "status": "already_joined",
            "match_id": match.id,
            "code": match.code,
            "role": existing_player.role
        }

    # Verify wallet has enough for stake
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet or wallet.balance_ksh < match.stake_amount_ksh:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Entry stake requires KSH {match.stake_amount_ksh}."
        )

    # Determine assigned role
    current_players = db.query(MatchPlayer).filter(MatchPlayer.match_id == match.id).all()
    runners = [p for p in current_players if p.role == "RUNNER"]
    hunters = [p for p in current_players if p.role == "HUNTER"]

    assigned_role = data.preferred_role.upper()
    if assigned_role == "RANDOM":
        if len(runners) == 0:
            assigned_role = "RUNNER"
        else:
            assigned_role = "HUNTER"
    elif assigned_role == "RUNNER" and len(runners) >= 1:
        # Default single hider mode
        assigned_role = "HUNTER"

    # Deduct stake into escrow
    wallet.balance_ksh -= match.stake_amount_ksh
    wallet.points -= (match.stake_amount_ksh / settings.POINTS_TO_KSH_RATE)
    match.total_pool_ksh += match.stake_amount_ksh

    player = MatchPlayer(
        match_id=match.id,
        user_id=current_user.id,
        role=assigned_role,
        ready=True
    )
    db.add(player)

    tx = Transaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount_ksh=-match.stake_amount_ksh,
        points_delta=-(match.stake_amount_ksh / settings.POINTS_TO_KSH_RATE),
        transaction_type="STAKE",
        status="SUCCESS",
        description=f"Match #{match.code} Escrow Entry Stake"
    )
    db.add(tx)
    db.commit()

    return {
        "status": "success",
        "message": f"Successfully joined arena {match.code}",
        "match_id": match.id,
        "code": match.code,
        "role": assigned_role,
        "total_pool_ksh": match.total_pool_ksh
    }

@router.post("/{code}/start")
def start_match(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Host triggers match start:
    - Changes match status to ACTIVE
    - Sets start_time countdown
    """
    match = db.query(GameMatch).filter(GameMatch.code == code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    if match.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the match host can start the match.")
    if match.status != "WAITING":
        raise HTTPException(status_code=400, detail="Match already started.")

    match.status = "ACTIVE"
    match.start_time = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "message": "Tactical match started!",
        "match_id": match.id,
        "code": match.code,
        "start_time": match.start_time.isoformat(),
        "total_pool_ksh": match.total_pool_ksh
    }

@router.get("/{code}")
def get_match_details(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves full match details, player list, and pool stake."""
    match = db.query(GameMatch).filter(GameMatch.code == code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    players = db.query(MatchPlayer).filter(MatchPlayer.match_id == match.id).all()
    hints = match.hints

    player_list = []
    for p in players:
        u = db.query(User).filter(User.id == p.user_id).first()
        player_list.append({
            "user_id": p.user_id,
            "username": u.username if u else "Agent",
            "role": p.role,
            "hp": p.hp,
            "ready": p.ready,
            "has_extra_life": p.has_extra_life
        })

    # Elapsed seconds calculation
    elapsed = 0
    if match.start_time and match.status == "ACTIVE":
        elapsed = int((datetime.utcnow() - match.start_time).total_seconds())

    return {
        "id": match.id,
        "code": match.code,
        "name": match.name,
        "status": match.status,
        "host_id": match.host_id,
        "hider_id": match.hider_id,
        "stake_amount_ksh": match.stake_amount_ksh,
        "total_pool_ksh": match.total_pool_ksh,
        "radius_meters": match.radius_meters,
        "center_lat": match.center_lat,
        "center_lon": match.center_lon,
        "duration_seconds": match.duration_seconds,
        "elapsed_seconds": elapsed,
        "clue_cascade_unlocked": match.clue_cascade_unlocked,
        "winner_id": match.winner_id,
        "win_reason": match.win_reason,
        "players": player_list,
        "hints_count": len(hints)
    }

@router.get("/")
def list_public_matches(db: Session = Depends(get_db)):
    """Lists waiting or active public arenas to discover and join."""
    matches = db.query(GameMatch).filter(
        GameMatch.status.in_(["WAITING", "ACTIVE"])
    ).order_by(GameMatch.created_at.desc()).limit(20).all()

    return [
        {
            "id": m.id,
            "code": m.code,
            "name": m.name,
            "status": m.status,
            "stake_amount_ksh": m.stake_amount_ksh,
            "total_pool_ksh": m.total_pool_ksh,
            "radius_meters": m.radius_meters,
            "duration_seconds": m.duration_seconds,
            "player_count": len(m.players)
        }
        for m in matches
    ]
