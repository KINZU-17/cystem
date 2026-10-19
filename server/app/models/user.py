from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone_number = Column(String(20), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_verified = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    reputation = relationship("UserReputation", back_populates="user", uselist=False, cascade="all, delete-orphan")
    match_participations = relationship("MatchPlayer", back_populates="user")

class UserReputation(Base):
    __tablename__ = "user_reputations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    trust_score = Column(Float, default=100.0)
    total_wins = Column(Integer, default=0)
    total_matches = Column(Integer, default=0)
    agent_tier = Column(String(30), default="Rookie Tracker")

    user = relationship("User", back_populates="reputation")

    def update_tier(self):
        if self.total_wins >= 50:
            self.agent_tier = "CYSTEM Elite"
        elif self.total_wins >= 20:
            self.agent_tier = "Urban Phantom"
        elif self.total_wins >= 5:
            self.agent_tier = "Active Operative"
        else:
            self.agent_tier = "Rookie Tracker"
