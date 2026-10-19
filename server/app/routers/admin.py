from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.wallet import Wallet, Transaction
from app.models.match import GameMatch
from app.models.dispute import DisputeTicket
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Oversight & Disputes"])

class ResolveDisputeRequest(BaseModel):
    ticket_id: int
    resolution: str  # 'REFUND', 'AWARD_SEEKER', 'REJECT'
    admin_note: Optional[str] = "Resolved by system administrator"

def verify_admin_access(
    current_user: User = Depends(get_current_user),
    x_admin_key: Optional[str] = Header(None)
):
    """Enforces admin access via user flag or master secret key header."""
    if current_user.is_admin or x_admin_key == settings.ADMIN_SECRET_KEY:
        return current_user
    raise HTTPException(status_code=403, detail="Admin access authorization required.")

@router.get("/metrics")
def get_platform_metrics(
    admin: User = Depends(verify_admin_access),
    db: Session = Depends(get_db)
):
    """
    Returns platform-wide operations metrics:
    - Total registered users
    - Active game matches
    - Total volume staked (KSH)
    - Admin platform cut accumulated (3 KSH fee tracking)
    """
    total_users = db.query(User).count()
    active_games = db.query(GameMatch).filter(GameMatch.status == "ACTIVE").count()
    total_matches = db.query(GameMatch).count()

    # Total volume staked
    stake_txs = db.query(Transaction).filter(Transaction.transaction_type == "STAKE").all()
    total_volume_staked = abs(sum(tx.amount_ksh for tx in stake_txs))

    # Admin fees collected
    admin_fee_txs = db.query(Transaction).filter(Transaction.transaction_type == "ADMIN_FEE").all()
    admin_fees_collected = sum(tx.amount_ksh for tx in admin_fee_txs)

    # Pending disputes
    pending_disputes = db.query(DisputeTicket).filter(DisputeTicket.status == "PENDING").count()

    return {
        "status": "operational",
        "total_users": total_users,
        "active_games": active_games,
        "total_matches": total_matches,
        "total_volume_staked_ksh": round(total_volume_staked, 2),
        "admin_fees_collected_ksh": round(admin_fees_collected, 2),
        "pending_disputes": pending_disputes,
        "conversion_peg": "1 Point = 130 KSH"
    }

@router.get("/disputes")
def get_disputes(
    admin: User = Depends(verify_admin_access),
    db: Session = Depends(get_db)
):
    """Returns active dispute queue with player details and match stakes."""
    tickets = db.query(DisputeTicket).order_by(DisputeTicket.created_at.desc()).all()
    results = []
    for t in tickets:
        match = db.query(GameMatch).filter(GameMatch.id == t.match_id).first()
        claimant = db.query(User).filter(User.id == t.claimant_id).first()
        results.append({
            "id": t.id,
            "match_id": t.match_id,
            "match_code": match.code if match else "N/A",
            "match_name": match.name if match else "Arena",
            "stake_amount_ksh": match.stake_amount_ksh if match else 0,
            "claimant_username": claimant.username if claimant else "Agent",
            "reason": t.reason,
            "status": t.status,
            "admin_note": t.admin_note,
            "created_at": t.created_at.isoformat()
        })
    return results

@router.post("/disputes/resolve")
def resolve_dispute(
    data: ResolveDisputeRequest,
    admin: User = Depends(verify_admin_access),
    db: Session = Depends(get_db)
):
    """
    Manually resolves a dispute:
    - REFUND: Returns stakes to match participants
    - AWARD_SEEKER: Credits pool to claimant
    - REJECT: Closes ticket with note
    """
    ticket = db.query(DisputeTicket).filter(DisputeTicket.id == data.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Dispute ticket not found.")

    match = db.query(GameMatch).filter(GameMatch.id == ticket.match_id).first()

    if data.resolution == "REFUND" and match:
        # Refund participants
        for p in match.players:
            w = db.query(Wallet).filter(Wallet.user_id == p.user_id).first()
            if w:
                w.balance_ksh += match.stake_amount_ksh
                w.points += (match.stake_amount_ksh / settings.POINTS_TO_KSH_RATE)
        ticket.status = "RESOLVED_REFUND"

    elif data.resolution == "AWARD_SEEKER" and match:
        w = db.query(Wallet).filter(Wallet.user_id == ticket.claimant_id).first()
        net = max(0.0, match.total_pool_ksh - match.admin_fee_ksh)
        if w:
            w.balance_ksh += net
            w.points += (net / settings.POINTS_TO_KSH_RATE)
        ticket.status = "RESOLVED_AWARD"

    else:
        ticket.status = "REJECTED"

    ticket.admin_note = data.admin_note
    ticket.resolved_at = datetime.utcnow()
    db.commit()

    return {
        "status": "success",
        "message": f"Dispute #{ticket.id} resolved as {ticket.status}",
        "ticket_id": ticket.id
    }
