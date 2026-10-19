import requests
from typing import Dict, Any
from app.core.config import settings

def send_sms_alert(phone_number: str, message: str) -> Dict[str, Any]:
    """
    Sends SMS alert to players via Africa's Talking API.
    """
    if not settings.AT_API_KEY:
        # Development simulated logger
        return {"status": "simulated", "recipient": phone_number, "message": message}

    url = (
        "https://api.sandbox.africastalking.com/version1/messaging"
        if settings.AT_USERNAME == "sandbox"
        else "https://api.africastalking.com/version1/messaging"
    )
    headers = {
        "apiKey": settings.AT_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
    }
    payload = {
        "username": settings.AT_USERNAME,
        "to": phone_number,
        "message": f"[CYSTEM] {message}"
    }

    try:
        res = requests.post(url, data=payload, headers=headers, timeout=10)
        return res.json()
    except requests.RequestException as e:
        return {"status": "failed", "error": str(e)}
