import os
import base64
import requests
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Wallet, Transaction
from security import decode_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/mpesa", tags=["M-Pesa"])
bearer = HTTPBearer()

CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "")
SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379")
PASSKEY = os.getenv("MPESA_PASSKEY", "")
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "https://your-domain.com/mpesa/callback")
SANDBOX = os.getenv("MPESA_SANDBOX", "true").lower() == "true"
BASE_URL = "https://sandbox.safaricom.co.ke" if SANDBOX else "https://api.safaricom.co.ke"


def current_user_id(creds: HTTPAuthorizationCredentials = Depends(bearer)) -> int:
    return decode_token(creds.credentials)


def _access_token() -> str:
    creds = base64.b64encode(f"{CONSUMER_KEY}:{CONSUMER_SECRET}".encode()).decode()
    res = requests.get(
        f"{BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {creds}"},
        timeout=10,
    )
    if res.status_code != 200:
        raise HTTPException(503, "Could not reach M-Pesa. Try again.")
    return res.json()["access_token"]


class DepositRequest(BaseModel):
    amount_ksh: int


@router.post("/deposit")
def deposit(
    data: DepositRequest,
    uid: int = Depends(current_user_id),
    db: Session = Depends(get_db),
):
    if data.amount_ksh < 10:
        raise HTTPException(400, "Minimum deposit is KSH 10.")
    wallet = db.query(Wallet).filter(Wallet.user_id == uid).first()
    if not wallet:
        raise HTTPException(404, "Wallet not found.")

    token = _access_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{SHORTCODE}{PASSKEY}{timestamp}".encode()).decode()

    payload = {
        "BusinessShortCode": SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": data.amount_ksh,
        "PartyA": wallet.user.phone,
        "PartyB": SHORTCODE,
        "PhoneNumber": wallet.user.phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": f"CYSTEM-{uid}",
        "TransactionDesc": "CYSTEM Wallet Deposit",
    }
    res = requests.post(
        f"{BASE_URL}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    body = res.json()
    checkout_id = body.get("CheckoutRequestID")
    if not checkout_id:
        raise HTTPException(502, "STK push failed. Check M-Pesa credentials.")

    db.add(Transaction(
        user_id=uid,
        amount_ksh=data.amount_ksh,
        transaction_type="DEPOSIT",
        mpesa_ref=checkout_id,
        status="PENDING",
    ))
    db.commit()
    return {"message": "STK push sent. Enter your M-Pesa PIN.", "checkout_id": checkout_id}


@router.post("/callback")
async def mpesa_callback(request: Request, db: Session = Depends(get_db)):
    try:
        body = await request.json()
        stk = body.get("Body", {}).get("stkCallback", {})
        result_code = stk.get("ResultCode")
        checkout_id = stk.get("CheckoutRequestID")

        txn = db.query(Transaction).filter(
            Transaction.mpesa_ref == checkout_id,
            Transaction.status == "PENDING",
        ).first()

        if not txn:
            return {"ResultCode": 0, "ResultDesc": "Already processed"}

        if result_code == 0:
            items = stk.get("CallbackMetadata", {}).get("Item", [])
            receipt = next((i["Value"] for i in items if i["Name"] == "MpesaReceiptNumber"), None)
            if receipt:
                txn.mpesa_ref = receipt
            txn.status = "SUCCESS"
            wallet = db.query(Wallet).filter(Wallet.user_id == txn.user_id).first()
            if wallet:
                wallet.balance_ksh += txn.amount_ksh
                wallet.points += txn.amount_ksh / 130.0
        else:
            txn.status = "FAILED"

        db.commit()
        return {"ResultCode": 0, "ResultDesc": "Accepted"}
    except Exception:
        raise HTTPException(500, "Callback processing error.")
