from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    balance_ksh = Column(Float, default=0.0)
    points = Column(Float, default=0.0)  # 1 Point = 130 KSH
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount_ksh = Column(Float, nullable=False)
    points_delta = Column(Float, default=0.0)
    # Types: DEPOSIT, STAKE, WIN_PAYOUT, WITHDRAWAL, ADMIN_FEE, REFUND
    transaction_type = Column(String(30), nullable=False)
    # Status: PENDING, SUCCESS, FAILED
    status = Column(String(20), default="PENDING")
    mpesa_receipt = Column(String(50), nullable=True)
    checkout_request_id = Column(String(100), index=True, nullable=True)
    phone_number = Column(String(20), nullable=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="transactions")
