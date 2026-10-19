from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class GameMatch(Base):
    __tablename__ = "game_matches"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(8), unique=True, index=True, nullable=False)
    name = Column(String(100), default="Public Arena Hunt")
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hider_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    # Status: WAITING, ACTIVE, FINISHED, CANCELLED
    status = Column(String(20), default="WAITING", index=True)
    
    # Financial stakes
    stake_amount_ksh = Column(Float, default=130.0)  # Default 1 Point (130 KSH)
    total_pool_ksh = Column(Float, default=0.0)
    admin_fee_ksh = Column(Float, default=3.0)       # 3 KSH platform commission

    # Geofence & Boundary (Coordinates)
    radius_meters = Column(Integer, default=500)
    center_lat = Column(Float, nullable=True)
    center_lon = Column(Float, nullable=True)
    hider_lat = Column(Float, nullable=True)
    hider_lon = Column(Float, nullable=True)

    # Timing
    duration_seconds = Column(Integer, default=1800)  # 30 mins default
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    clue_cascade_unlocked = Column(Boolean, default=False)

    # Resolution
    winner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    win_reason = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    players = relationship("MatchPlayer", back_populates="match", cascade="all, delete-orphan")
    hints = relationship("HintDrop", back_populates="match", cascade="all, delete-orphan")
    disputes = relationship("DisputeTicket", back_populates="match", cascade="all, delete-orphan")

class MatchPlayer(Base):
    __tablename__ = "match_players"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("game_matches.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="HUNTER")  # HUNTER, RUNNER
    ready = Column(Boolean, default=False)
    hp = Column(Integer, default=100)
    has_extra_life = Column(Boolean, default=False)
    last_lat = Column(Float, nullable=True)
    last_lon = Column(Float, nullable=True)
    last_ping_time = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("GameMatch", back_populates="players")
    user = relationship("User", back_populates="match_participations")

class HintDrop(Base):
    __tablename__ = "hint_drops"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("game_matches.id", ondelete="CASCADE"), nullable=False)
    hider_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    clue_number = Column(Integer, default=1)
    media_url = Column(Text, nullable=True)  # Base64 data URL or CDN path
    media_type = Column(String(20), default="photo")  # photo, video
    hint_text = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    match = relationship("GameMatch", back_populates="hints")
