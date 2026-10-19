from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Wallet, Transaction
from security import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/wallet", tags=["Wallet"])
bearer = HTTPBearer()

POINTS_TO_KSH = 130.0
ADMIN_FEE_KSH = 3.0

def current_user_id(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> int:
    return decode_token(creds.credentials)

@router.get("/balance")
def balance(uid: int = Depends(current_user_id), db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == uid).first()
    if not wallet:
        raise HTTPException(404, "Wallet not found.")
    return {
        "balance_ksh": wallet.balance_ksh,
        "points": wallet.points,
        "points_to_ksh_rate": POINTS_TO_KSH,
    }

class WithdrawRequest(BaseModel):
    points: float

@router.post("/withdraw")
def withdraw(data: WithdrawRequest, uid: int = Depends(current_user_id), db: Session = Depends(get_db)):
    wallet = db.query(Wallet).filter(Wallet.user_id == uid).first()
    if not wallet or wallet.points < data.points:
        raise HTTPException(400, "Insufficient points.")
    gross_ksh = data.points * POINTS_TO_KSH
    net_ksh = gross_ksh - ADMIN_FEE_KSH
    wallet.points -= data.points
    wallet.balance_ksh -= gross_ksh
    db.add(Transaction(user_id=uid, amount_ksh=net_ksh, transaction_type="WITHDRAWAL", status="PENDING"))
    db.add(Transaction(user_id=uid, amount_ksh=ADMIN_FEE_KSH, transaction_type="ADMIN_FEE", status="SUCCESS"))
    db.commit()
    return {"net_payout_ksh": net_ksh, "admin_fee_ksh": ADMIN_FEE_KSH}
