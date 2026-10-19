from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, Wallet
from security import hash_password, verify_password, validate_password, check_breach, create_token

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    phone: str  # 2547XXXXXXXX
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register")
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    validate_password(data.password)
    check_breach(data.password)
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered.")
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken.")
    user = User(
        username=data.username,
        email=data.email,
        phone=data.phone,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    db.flush()
    db.add(Wallet(user_id=user.id))
    db.commit()
    return {"token": create_token(user.id), "username": user.username}

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Invalid email or password.")
    return {"token": create_token(user.id), "username": user.username}
