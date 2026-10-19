import re
import hashlib
import os
import requests
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
from fastapi import HTTPException

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters.")
    if not re.search(r"\d", password):
        raise HTTPException(400, "Password must contain at least one number.")
    if not re.search(r"[@$!%*?&]", password):
        raise HTTPException(400, "Password must contain at least one special character.")

def check_breach(password: str):
    sha1 = hashlib.sha1(password.encode()).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]
    try:
        res = requests.get(f"https://api.pwnedpasswords.com/range/{prefix}", timeout=5)
        for line in res.text.splitlines():
            h, _ = line.split(":")
            if h == suffix:
                raise HTTPException(400, "Password found in a known data breach. Choose a safer one.")
    except HTTPException:
        raise
    except Exception:
        pass  # Don't block signup if HIBP is unreachable

def create_token(user_id: int) -> str:
    payload = {"sub": str(user_id), "exp": datetime.utcnow() + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return int(payload["sub"])
    except Exception:
        raise HTTPException(401, "Invalid or expired token.")
