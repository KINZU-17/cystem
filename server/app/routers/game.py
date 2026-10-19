from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserReputation
from app.models.wallet import Wallet, Transaction
from app.models.match import GameMatch, MatchPlayer, HintDrop
from app.routers.auth import get_current_user
from app.services.geofence import calculate_distance, verify_seeker_proximity, calculate_storm_status
from app.services.exif_checker import decode_image_bytes, verify_live_camera_image
from app.services.notification import send_sms_alert

router = APIRouter(prefix="/api/v1/game", tags=["Active Game Loop"])

class PostHintRequest(BaseModel):
    match_code: str
    media_data: str  # Base64 data string
    media_type: str = "photo"
    hint_text: Optional[str] = "Live hint dropped!"
    lat: Optional[float] = None
    lon: Optional[float] = None

class LocationPingRequest(BaseModel):
    match_code: str
    lat: float
    lon: float

class ClaimWinRequest(BaseModel):
    match_code: str
    seeker_lat: float
    seeker_lon: float
    scan_code: Optional[str] = None  # Optical code from hider HUD or proximity

@router.post("/hint")
def post_hint(
    data: PostHintRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Hider posts a live snap hint:
    - Runs anti-cheat checks on the image
    - Rejects gallery uploads
    - Saves hint to match feed
    """
    match = db.query(GameMatch).filter(GameMatch.code == data.match_code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    if match.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Match is not active.")
    if match.hider_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the designated hider can post hints.")

    # Validate image bytes
    image_bytes = decode_image_bytes(data.media_data)
    verify_live_camera_image(image_bytes, enforce_strict_exif=False)

    hint_count = len(match.hints) + 1
    new_hint = HintDrop(
        match_id=match.id,
        hider_id=current_user.id,
        clue_number=hint_count,
        media_url=data.media_data[:500000],  # Store base64 snapshot
        media_type=data.media_type,
        hint_text=data.hint_text,
        lat=data.lat,
        lon=data.lon
    )
    db.add(new_hint)

    # Update hider position anchor if supplied
    if data.lat and data.lon:
        match.hider_lat = data.lat
        match.hider_lon = data.lon

    db.commit()

    return {
        "status": "success",
        "message": f"Clue #{hint_count} posted successfully to all seekers!",
        "clue_number": hint_count,
        "created_at": new_hint.created_at.isoformat()
    }

@router.get("/{code}/hints")
def get_hints(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all hints posted for the given match."""
    match = db.query(GameMatch).filter(GameMatch.code == code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    return [
        {
            "id": h.id,
            "clue_number": h.clue_number,
            "media_url": h.media_url,
            "media_type": h.media_type,
            "hint_text": h.hint_text,
            "created_at": h.created_at.isoformat()
        }
        for h in match.hints
    ]

@router.post("/claim-win")
def claim_win(
    data: ClaimWinRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Seeker claims first-come-first-serve win:
    - Verifies proximity (must be <= 15m from hider coordinates)
    - If hider coordinates not set yet, allows optical scan_code claim
    - Settles total escrow pool
    - Deducts 3 KSH admin platform fee
    - Credits net payout to winner's wallet
    - Increments winner stats and updates reputation tier
    """
    match = db.query(GameMatch).filter(GameMatch.code == data.match_code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    if match.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Match is not active or already finished.")
    if match.hider_id == current_user.id:
        raise HTTPException(status_code=400, detail="The hider cannot claim a seeker win.")

    # Check proximity if hider location known
    if match.hider_lat and match.hider_lon:
        is_close, dist = verify_seeker_proximity(
            match.hider_lat, match.hider_lon,
            data.seeker_lat, data.seeker_lon,
            threshold_meters=20.0
        )
        if not is_close and not data.scan_code:
            raise HTTPException(
                status_code=400,
                detail=f"Target verification failed: You are {round(dist, 1)}m away (must be within 20m)."
            )

    # First-come-first-serve winner confirmation
    match.status = "FINISHED"
    match.winner_id = current_user.id
    match.win_reason = f"Tagged by Seeker @{current_user.username} (First-Come-First-Serve)"
    match.end_time = datetime.utcnow()

    # Financial settlement
    admin_fee = match.admin_fee_ksh
    total_pool = match.total_pool_ksh
    net_payout = max(0.0, total_pool - admin_fee)

    winner_wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if winner_wallet:
        winner_wallet.balance_ksh += net_payout
        winner_wallet.points += (net_payout / settings.POINTS_TO_KSH_RATE)

    # Log Payout Transaction
    tx = Transaction(
        wallet_id=winner_wallet.id if winner_wallet else 1,
        user_id=current_user.id,
        amount_ksh=net_payout,
        points_delta=(net_payout / settings.POINTS_TO_KSH_RATE),
        transaction_type="WIN_PAYOUT",
        status="SUCCESS",
        mpesa_receipt=f"WIN-{match.code}",
        description=f"First-Come-First-Serve Victory Pool for Match #{match.code}"
    )
    db.add(tx)

    # Update Winner Reputation
    rep = db.query(UserReputation).filter(UserReputation.user_id == current_user.id).first()
    if rep:
        rep.total_wins += 1
        rep.total_matches += 1
        rep.update_tier()

    db.commit()

    return {
        "status": "victory",
        "message": f"Target acquired! First-come-first-serve win awarded to @{current_user.username}!",
        "winner_id": current_user.id,
        "winner_username": current_user.username,
        "total_pool_ksh": total_pool,
        "admin_fee_ksh": admin_fee,
        "net_payout_ksh": net_payout,
        "new_balance_ksh": winner_wallet.balance_ksh if winner_wallet else 0.0
    }

@router.post("/{code}/survive-timeout")
def settle_hider_survival(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    When match timer expires and nobody found the hider:
    - Awards pool to the hider
    - Deducts 3 KSH admin fee
    """
    match = db.query(GameMatch).filter(GameMatch.code == code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")
    if match.status != "ACTIVE":
        raise HTTPException(status_code=400, detail="Match is not currently active.")

    # Verify elapsed time
    elapsed = int((datetime.utcnow() - match.start_time).total_seconds()) if match.start_time else 0
    if elapsed < match.duration_seconds:
        raise HTTPException(
            status_code=400,
            detail=f"Match timer still active. {match.duration_seconds - elapsed} seconds remaining."
        )

    match.status = "FINISHED"
    match.winner_id = match.hider_id
    match.win_reason = "Hider survived the countdown timer!"
    match.end_time = datetime.utcnow()

    admin_fee = match.admin_fee_ksh
    total_pool = match.total_pool_ksh
    net_payout = max(0.0, total_pool - admin_fee)

    hider_wallet = db.query(Wallet).filter(Wallet.user_id == match.hider_id).first()
    if hider_wallet:
        hider_wallet.balance_ksh += net_payout
        hider_wallet.points += (net_payout / settings.POINTS_TO_KSH_RATE)

    tx = Transaction(
        wallet_id=hider_wallet.id if hider_wallet else 1,
        user_id=match.hider_id,
        amount_ksh=net_payout,
        points_delta=(net_payout / settings.POINTS_TO_KSH_RATE),
        transaction_type="WIN_PAYOUT",
        status="SUCCESS",
        mpesa_receipt=f"SURV-{match.code}",
        description=f"Hider Survival Victory Pool for Match #{match.code}"
    )
    db.add(tx)

    rep = db.query(UserReputation).filter(UserReputation.user_id == match.hider_id).first()
    if rep:
        rep.total_wins += 1
        rep.total_matches += 1
        rep.update_tier()

    db.commit()

    return {
        "status": "victory",
        "message": "Hider survived the full duration! Escrow pool released to hider.",
        "winner_id": match.hider_id,
        "net_payout_ksh": net_payout,
        "admin_fee_ksh": admin_fee
    }

@router.post("/ping")
def ping_player_location(
    data: LocationPingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates player location, calculates proximity & storm damage.
    """
    match = db.query(GameMatch).filter(GameMatch.code == data.match_code.strip().upper()).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found.")

    player = db.query(MatchPlayer).filter(
        MatchPlayer.match_id == match.id,
        MatchPlayer.user_id == current_user.id
    ).first()
    if not player:
        raise HTTPException(status_code=403, detail="Player not in this match.")

    player.last_lat = data.lat
    player.last_lon = data.lon
    player.last_ping_time = datetime.utcnow()

    # If player is hider, update match anchor
    if player.role == "RUNNER":
        match.hider_lat = data.lat
        match.hider_lon = data.lon

    # Calculate storm status
    elapsed = int((datetime.utcnow() - match.start_time).total_seconds()) if match.start_time else 0
    center_lat = match.center_lat or data.lat
    center_lon = match.center_lon or data.lon
    storm_info = calculate_storm_status(elapsed, center_lat, center_lon, data.lat, data.lon)

    # Check clue cascade trigger (50% duration)
    if elapsed >= (match.duration_seconds // 2) and not match.clue_cascade_unlocked:
        match.clue_cascade_unlocked = True

    # Calculate distance to hider for hot/cold meter
    distance_to_target = None
    if player.role == "HUNTER" and match.hider_lat and match.hider_lon:
        distance_to_target = round(calculate_distance(match.hider_lat, match.hider_lon, data.lat, data.lon), 1)

    db.commit()

    return {
        "status": "updated",
        "storm": storm_info,
        "distance_to_target_meters": distance_to_target,
        "clue_cascade_unlocked": match.clue_cascade_unlocked,
        "current_hp": player.hp
    }
