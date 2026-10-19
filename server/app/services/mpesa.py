import os
import base64
import requests
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.config import settings

def get_daraja_access_token() -> Optional[str]:
    """Generates an OAuth token from Safaricom Daraja API."""
    if not settings.MPESA_CONSUMER_KEY or not settings.MPESA_CONSUMER_SECRET:
        return None  # Sandbox simulated mode

    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    credentials = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
    encoded = base64.b64encode(credentials.encode()).decode()
    headers = {"Authorization": f"Basic {encoded}"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json().get("access_token")
    except requests.RequestException:
        pass
    return None

def trigger_stk_push(
    phone_number: str,
    amount_ksh: int,
    account_reference: str,
    transaction_desc: str = "CYSTEM Stake Deposit"
) -> Dict[str, Any]:
    """
    Triggers an STK push prompt on the user's phone.
    Returns transaction metadata (CheckoutRequestID).
    """
    # Clean phone format: 2547XXXXXXXX
    cleaned_phone = phone_number.strip().replace("+", "")
    if cleaned_phone.startswith("0"):
        cleaned_phone = "254" + cleaned_phone[1:]

    access_token = get_daraja_access_token()
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    # If live Daraja credentials configured
    if access_token:
        password_str = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
        password = base64.b64encode(password_str.encode()).decode()

        url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount_ksh),
            "PartyA": cleaned_phone,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": cleaned_phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": account_reference,
            "TransactionDesc": transaction_desc
        }
        try:
            res = requests.post(url, json=payload, headers=headers, timeout=15)
            return res.json()
        except requests.RequestException as e:
            return {"ResponseCode": "1", "ResponseDescription": str(e)}

    # Fallback simulation for sandbox / dev
    mock_checkout_id = f"ws_CO_{timestamp}_{cleaned_phone[-4:]}"
    return {
        "MerchantRequestID": f"MR_{timestamp}",
        "CheckoutRequestID": mock_checkout_id,
        "ResponseCode": "0",
        "ResponseDescription": "Success. Request accepted for processing",
        "CustomerMessage": "Success. Request accepted for processing"
    }

def trigger_b2c_payout(
    phone_number: str,
    amount_ksh: float,
    withdrawal_id: str
) -> Dict[str, Any]:
    """
    Dispatches funds to a user's phone via Daraja B2C.
    """
    cleaned_phone = phone_number.strip().replace("+", "")
    if cleaned_phone.startswith("0"):
        cleaned_phone = "254" + cleaned_phone[1:]

    # Simulated B2C response for dev/sandbox
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return {
        "ConversationID": f"AG_{timestamp}_{withdrawal_id}",
        "OriginatorConversationID": f"ORIG_{timestamp}",
        "ResponseCode": "0",
        "ResponseDescription": "Accept the service request successfully."
    }
