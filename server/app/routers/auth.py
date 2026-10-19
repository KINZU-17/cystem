from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    validate_password_strength,
    check_password_breach,
    create_access_token,
    decode_access_token
)
from app.models.user import User, UserReputation
from app.models.wallet import Wallet
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    phone_number: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency to retrieve authenticated user from JWT token."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required."
        )
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found."
        )
    return user

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user account:
    - Enforces 8+ chars, uppercase, number, special symbol
    - Verifies password against HaveIBeenPwned data breaches
    - Hashes password using bcrypt
    - Initializes User wallet (0 KSH) and reputation tracker
    """
    # 1. Security Validations
    validate_password_strength(data.password)
    check_password_breach(data.password)

    # 2. Check Uniqueness
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered.")
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    if db.query(User).filter(User.phone_number == data.phone_number).first():
        raise HTTPException(status_code=400, detail="Phone number already registered.")

    # 3. Create User, Wallet, Reputation
    hashed = hash_password(data.password)
    new_user = User(
        username=data.username,
        email=data.email,
        phone_number=data.phone_number,
        hashed_password=hashed
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Initialize Wallet
    user_wallet = Wallet(user_id=new_user.id, balance_ksh=0.0, points=0.0)
    db.add(user_wallet)

    # Initialize Reputation
    user_rep = UserReputation(user_id=new_user.id)
    db.add(user_rep)
    db.commit()

    token = create_access_token({"sub": str(new_user.id), "username": new_user.username})
    return {
        "status": "success",
        "message": "User registered successfully.",
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "phone_number": new_user.phone_number,
            "agent_tier": user_rep.agent_tier
        }
    }

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates user and returns JWT access token."""
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password."
        )

    token = create_access_token({"sub": str(user.id), "username": user.username})
    rep = db.query(UserReputation).filter(UserReputation.user_id == user.id).first()
    wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "phone_number": user.phone_number,
            "is_admin": user.is_admin,
            "agent_tier": rep.agent_tier if rep else "Rookie Tracker",
            "trust_score": rep.trust_score if rep else 100.0,
            "balance_ksh": wallet.balance_ksh if wallet else 0.0,
            "points": wallet.points if wallet else 0.0
        }
    }

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Returns profile and active wallet stats for authenticated user."""
    rep = db.query(UserReputation).filter(UserReputation.user_id == current_user.id).first()
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "phone_number": current_user.phone_number,
        "is_admin": current_user.is_admin,
        "agent_tier": rep.agent_tier if rep else "Rookie Tracker",
        "trust_score": rep.trust_score if rep else 100.0,
        "balance_ksh": wallet.balance_ksh if wallet else 0.0,
        "points": wallet.points if wallet else 0.0
    }
