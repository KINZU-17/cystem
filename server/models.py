from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    phone = Column(String, unique=True, nullable=False)  # 2547XXXXXXXX
    hashed_password = Column(String, nullable=False)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    wallet = relationship("Wallet", back_populates="user", uselist=False)

class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    balance_ksh = Column(Float, default=0.0)
    points = Column(Float, default=0.0)  # 1 point = 130 KSH
    user = relationship("User", back_populates="wallet")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount_ksh = Column(Float, nullable=False)
    # DEPOSIT | STAKE | WIN_PAYOUT | WITHDRAWAL | ADMIN_FEE
    transaction_type = Column(String, nullable=False)
    mpesa_ref = Column(String, unique=True, nullable=True)
    status = Column(String, default="PENDING")  # PENDING | SUCCESS | FAILED
    created_at = Column(DateTime, default=datetime.utcnow)
