from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.wallet import Wallet, Transaction
from app.routers.auth import get_current_user
from app.services.mpesa import trigger_stk_push, trigger_b2c_payout
from app.services.notification import send_sms_alert

router = APIRouter(prefix="/api/v1/wallet", tags=["Wallet & Payments"])

class DepositRequest(BaseModel):
    phone_number: str
    amount_ksh: float

class WithdrawRequest(BaseModel):
    phone_number: str
    amount_ksh: float

@router.get("/")
def get_wallet(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns wallet balance, points equivalent, and conversion rates."""
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        wallet = Wallet(user_id=current_user.id, balance_ksh=0.0, points=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)

    return {
        "user_id": current_user.id,
        "balance_ksh": wallet.balance_ksh,
        "points": wallet.points,
        "conversion_rate_ksh_per_point": settings.POINTS_TO_KSH_RATE,
        "admin_fee_ksh": settings.ADMIN_WITHDRAWAL_FEE_KSH
    }

@router.post("/deposit/stk")
def initiate_deposit(
    data: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers M-Pesa STK Push prompt to user phone.
    Creates a PENDING transaction ledger entry.
    """
    if data.amount_ksh < 10.0:
        raise HTTPException(status_code=400, detail="Minimum deposit is 10 KSH.")

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet:
        wallet = Wallet(user_id=current_user.id)
        db.add(wallet)
        db.commit()

    # Create Pending Transaction
    tx = Transaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount_ksh=data.amount_ksh,
        points_delta=data.amount_ksh / settings.POINTS_TO_KSH_RATE,
        transaction_type="DEPOSIT",
        status="PENDING",
        phone_number=data.phone_number,
        description="M-Pesa STK Push Top-Up"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    # Trigger STK Push
    res = trigger_stk_push(
        phone_number=data.phone_number,
        amount_ksh=int(data.amount_ksh),
        account_reference=f"CYS-{current_user.username[:6].upper()}"
    )

    checkout_id = res.get("CheckoutRequestID")
    if checkout_id:
        tx.checkout_request_id = checkout_id
        db.commit()

    return {
        "status": "initiated",
        "message": "STK prompt sent to your phone. Enter your PIN to complete deposit.",
        "transaction_id": tx.id,
        "checkout_request_id": checkout_id
    }

@router.post("/mpesa/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    """
    Daraja Lipa Na M-Pesa Webhook Callback.
    Verifies transaction status and idempotently credits user's wallet.
    """
    try:
        body = await request.json()
        stk_callback = body.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        checkout_id = stk_callback.get("CheckoutRequestID")

        tx = db.query(Transaction).filter(
            Transaction.checkout_request_id == checkout_id,
            Transaction.status == "PENDING"
        ).first()

        if not tx:
            return {"ResultCode": 0, "ResultDesc": "Callback processed or not found"}

        if result_code == 0:
            tx.status = "SUCCESS"
            # Extract receipt number
            items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            for item in items:
                if item.get("Name") == "MpesaReceiptNumber":
                    tx.mpesa_receipt = str(item.get("Value"))

            # Credit Wallet
            wallet = db.query(Wallet).filter(Wallet.id == tx.wallet_id).first()
            if wallet:
                wallet.balance_ksh += tx.amount_ksh
                wallet.points += tx.points_delta

            db.commit()
        else:
            tx.status = "FAILED"
            db.commit()

        return {"ResultCode": 0, "ResultDesc": "Success"}
    except Exception:
        # Prevent stack trace leakage to webhook caller
        return {"ResultCode": 1, "ResultDesc": "Internal Callback Processing Error"}

@router.post("/deposit/simulate-complete")
def simulate_deposit_complete(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Development helper: Simulates instantaneous STK push approval
    without requiring a live Safaricom public webhook tunnel.
    """
    tx = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
        Transaction.status == "PENDING"
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Pending transaction not found.")

    tx.status = "SUCCESS"
    tx.mpesa_receipt = f"QK{int(datetime.utcnow().timestamp())}CYS"

    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    wallet.balance_ksh += tx.amount_ksh
    wallet.points += tx.points_delta

    db.commit()
    return {
        "status": "success",
        "message": f"Successfully credited KSH {tx.amount_ksh} ({round(tx.points_delta, 2)} Pts)",
        "new_balance_ksh": wallet.balance_ksh,
        "new_points": wallet.points,
        "receipt": tx.mpesa_receipt
    }

@router.post("/withdraw")
def withdraw_funds(
    data: WithdrawRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Withdraw points/cash to M-Pesa.
    Applies flat 3 KSH platform fee to the withdrawal.
    """
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    if not wallet or wallet.balance_ksh < data.amount_ksh:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance.")

    admin_fee = settings.ADMIN_WITHDRAWAL_FEE_KSH
    if data.amount_ksh <= admin_fee:
        raise HTTPException(status_code=400, detail=f"Amount must exceed platform fee of KSH {admin_fee}.")

    net_payout = data.amount_ksh - admin_fee
    points_deducted = data.amount_ksh / settings.POINTS_TO_KSH_RATE

    # Deduct balance
    wallet.balance_ksh -= data.amount_ksh
    wallet.points -= points_deducted

    # Log user withdrawal transaction
    tx = Transaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount_ksh=net_payout,
        points_delta=-points_deducted,
        transaction_type="WITHDRAWAL",
        status="SUCCESS",
        phone_number=data.phone_number,
        mpesa_receipt=f"WTH{int(datetime.utcnow().timestamp())}",
        description=f"Withdrawal to {data.phone_number} (KSH {admin_fee} fee applied)"
    )
    db.add(tx)

    # Log admin cut transaction
    admin_tx = Transaction(
        wallet_id=wallet.id,
        user_id=current_user.id,
        amount_ksh=admin_fee,
        points_delta=0.0,
        transaction_type="ADMIN_FEE",
        status="SUCCESS",
        description=f"Platform 3 KSH fee from withdrawal #{tx.id}"
    )
    db.add(admin_tx)
    db.commit()

    # Trigger B2C payout
    trigger_b2c_payout(data.phone_number, net_payout, str(tx.id))
    send_sms_alert(data.phone_number, f"KSH {net_payout} sent to your M-Pesa. Ref: {tx.mpesa_receipt}")

    return {
        "status": "success",
        "message": f"Successfully withdrew KSH {net_payout} to {data.phone_number}",
        "net_payout_ksh": net_payout,
        "admin_fee_ksh": admin_fee,
        "remaining_balance_ksh": wallet.balance_ksh,
        "receipt": tx.mpesa_receipt
    }

@router.get("/transactions")
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns ledger transaction history for user."""
    txs = db.query(Transaction).filter(
        Transaction.user_id == current_user.id
    ).order_by(Transaction.created_at.desc()).limit(50).all()

    return [
        {
            "id": t.id,
            "amount_ksh": t.amount_ksh,
            "points_delta": t.points_delta,
            "type": t.transaction_type,
            "status": t.status,
            "receipt": t.mpesa_receipt,
            "description": t.description,
            "date": t.created_at.isoformat()
        }
        for t in txs
    ]
