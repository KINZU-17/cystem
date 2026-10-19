import sys
import os

sys.path.insert(0, '/home/james-nzuki/snap/antigravity-cli/common/local/lib/python3.14/dist-packages')
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import SessionLocal, Base, engine
from app.core.security import hash_password
from app.models.user import User, UserReputation
from app.models.wallet import Wallet, Transaction
from app.models.match import GameMatch, MatchPlayer, HintDrop
from app.models.dispute import DisputeTicket

def seed():
    print("Seeding CYSTEM demo database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Admin Account
    admin = db.query(User).filter(User.username == "cystem_admin").first()
    if not admin:
        admin = User(
            username="cystem_admin",
            email="admin@cystem.global",
            phone_number="254700000000",
            hashed_password=hash_password("AdminPass@2026"),
            is_admin=True,
            is_verified=True
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        db.add(Wallet(user_id=admin.id, balance_ksh=10000.0, points=76.92))
        db.add(UserReputation(user_id=admin.id, agent_tier="CYSTEM Elite", trust_score=100.0, total_wins=42))
        db.commit()
        print("  ✓ Created Admin: @cystem_admin (Password: AdminPass@2026)")

    # 2. Hider Operative
    hider = db.query(User).filter(User.username == "GhostRunner").first()
    if not hider:
        hider = User(
            username="GhostRunner",
            email="ghost@cystem.global",
            phone_number="254711223344",
            hashed_password=hash_password("GhostSecret@2026"),
            is_verified=True
        )
        db.add(hider)
        db.commit()
        db.refresh(hider)

        db.add(Wallet(user_id=hider.id, balance_ksh=2600.0, points=20.0))
        db.add(UserReputation(user_id=hider.id, agent_tier="Urban Phantom", trust_score=98.5, total_wins=16))
        db.commit()
        print("  ✓ Created Operative: @GhostRunner (Password: GhostSecret@2026)")

    # 3. Active Public Match Arena
    active_match = db.query(GameMatch).filter(GameMatch.code == "ARENA1").first()
    if not active_match:
        active_match = GameMatch(
            code="ARENA1",
            name="University Central Quad Pursuit",
            host_id=hider.id,
            hider_id=hider.id,
            status="ACTIVE",
            stake_amount_ksh=260.0,
            total_pool_ksh=780.0,
            radius_meters=600,
            duration_seconds=1800,
            center_lat=-1.2921,
            center_lon=36.8219,
            hider_lat=-1.29215,
            hider_lon=36.82195
        )
        db.add(active_match)
        db.commit()
        db.refresh(active_match)

        db.add(MatchPlayer(match_id=active_match.id, user_id=hider.id, role="RUNNER", ready=True))
        
        # Add initial clue
        db.add(HintDrop(
            match_id=active_match.id,
            hider_id=hider.id,
            clue_number=1,
            hint_text="Hiding behind the red brick library pillar near the solar canopy.",
            lat=-1.29215,
            lon=36.82195
        ))
        db.commit()
        print("  ✓ Created Public Arena: Code ARENA1 with active Clue #1")

    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed()
