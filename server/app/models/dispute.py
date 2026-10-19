from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class DisputeTicket(Base):
    __tablename__ = "dispute_tickets"

    id = Column(Integer, primary_key=True, index=True)
    match_id = Column(Integer, ForeignKey("game_matches.id", ondelete="CASCADE"), nullable=False)
    claimant_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(Text, nullable=False)
    # Status: PENDING, RESOLVED_REFUND, RESOLVED_AWARD, REJECTED
    status = Column(String(30), default="PENDING")
    admin_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    match = relationship("GameMatch", back_populates="disputes")
