import sys
import os
import os

# Add server to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.services.geofence import calculate_distance, verify_seeker_proximity, calculate_storm_status
from app.core.security import hash_password, verify_password, validate_password_strength

client = TestClient(app)

def setup_module(module):
    # Initialize fresh tables
    Base.metadata.create_all(bind=engine)

def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Operational 🟢"
    assert "CYSTEM" in data["system"]

def test_password_security_rules():
    # Passwords without numbers or uppercase or special symbols should be rejected
    rejected = 0
    for pwd in ["weak", "NoNumberSpecial!", "nonuppercase123@"]:
        try:
            validate_password_strength(pwd)
        except Exception:
            rejected += 1
    assert rejected == 3
    # Valid strong password
    validate_password_strength("CystemAgent@2026")

def test_haversine_distance_and_proximity():
    # Coords close together (~10 meters)
    lat1, lon1 = -1.292100, 36.821900
    lat2, lon2 = -1.292108, 36.821905
    dist = calculate_distance(lat1, lon1, lat2, lon2)
    assert dist < 20.0

    is_close, d = verify_seeker_proximity(lat1, lon1, lat2, lon2, threshold_meters=15.0)
    assert is_close is True

    # Coords far apart (Nairobi to Mombasa ~440km)
    is_far, far_dist = verify_seeker_proximity(-1.2921, 36.8219, -4.0435, 39.6682)
    assert is_far is False
    assert far_dist > 400000

def test_storm_phase_calculation():
    # Opening phase (0s elapsed)
    storm0 = calculate_storm_status(0, -1.2921, 36.8219, -1.2921, 36.8219)
    assert storm0["phase"] == 0
    assert storm0["current_radius"] == 500
    assert storm0["in_safe_zone"] is True
    assert storm0["damage_rate"] == 0

    # Phase 2 (700s elapsed = 11 mins)
    storm2 = calculate_storm_status(700, -1.2921, 36.8219, -1.2921, 36.8219)
    assert storm2["phase"] == 2
    assert storm2["current_radius"] == 220

def test_user_registration_and_auth():
    username = f"agent_{os.urandom(3).hex()}"
    res = client.post("/api/v1/auth/register", json={
        "username": username,
        "email": f"{username}@cystem.global",
        "phone_number": f"2547{os.urandom(4).hex()[:8]}",
        "password": "SecurePassword@2026"
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["user"]["username"] == username

    # Login check
    login_res = client.post("/api/v1/auth/login", json={
        "username": username,
        "password": "SecurePassword@2026"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

def test_full_game_and_escrow_loop():
    # 1. Register Hider
    hider_name = f"hider_{os.urandom(3).hex()}"
    hider_phone = f"25471{os.urandom(3).hex()[:7]}"
    hider_res = client.post("/api/v1/auth/register", json={
        "username": hider_name,
        "email": f"{hider_name}@cystem.global",
        "phone_number": hider_phone,
        "password": "HiderSecurePass#2026"
    }).json()
    hider_token = hider_res["access_token"]
    hider_headers = {"Authorization": f"Bearer {hider_token}"}

    # 2. Deposit funds for Hider (simulate instant deposit)
    dep_res = client.post("/api/v1/wallet/deposit/stk", json={
        "phone_number": hider_phone,
        "amount_ksh": 500
    }, headers=hider_headers).json()
    tx_id = dep_res["transaction_id"]

    sim_res = client.post(f"/api/v1/wallet/deposit/simulate-complete?transaction_id={tx_id}", headers=hider_headers).json()
    assert sim_res["new_balance_ksh"] == 500

    # 3. Create Arena Hunt Match
    match_res = client.post("/api/v1/matches/create", json={
        "name": "Nairobi CBD Hunt",
        "stake_amount_ksh": 130.0,
        "radius_meters": 500,
        "duration_seconds": 1200
    }, headers=hider_headers).json()
    code = match_res["code"]
    assert len(code) == 6
    assert match_res["stake_amount_ksh"] == 130.0

    # 4. Register Seeker
    seeker_name = f"seeker_{os.urandom(3).hex()}"
    seeker_phone = f"25472{os.urandom(3).hex()[:7]}"
    seeker_res = client.post("/api/v1/auth/register", json={
        "username": seeker_name,
        "email": f"{seeker_name}@cystem.global",
        "phone_number": seeker_phone,
        "password": "SeekerSecurePass#2026"
    }).json()
    seeker_token = seeker_res["access_token"]
    seeker_headers = {"Authorization": f"Bearer {seeker_token}"}

    # Seeker deposits funds
    s_dep = client.post("/api/v1/wallet/deposit/stk", json={
        "phone_number": seeker_phone,
        "amount_ksh": 300
    }, headers=seeker_headers).json()
    client.post(f"/api/v1/wallet/deposit/simulate-complete?transaction_id={s_dep['transaction_id']}", headers=seeker_headers)

    # 5. Seeker Joins Match by 6-char Code
    join_res = client.post("/api/v1/matches/join", json={
        "code": code,
        "preferred_role": "HUNTER"
    }, headers=seeker_headers).json()
    assert join_res["status"] == "success"
    assert join_res["total_pool_ksh"] == 260.0  # 130 Hider + 130 Seeker

    # 6. Host starts match
    start_res = client.post(f"/api/v1/matches/{code}/start", headers=hider_headers).json()
    assert start_res["status"] == "success"

    # 7. Seeker Claims Win (Within Proximity or Optical Verification)
    claim_res = client.post("/api/v1/game/claim-win", json={
        "match_code": code,
        "seeker_lat": -1.2921,
        "seeker_lon": 36.8219,
        "scan_code": "OPTICAL_TARGET_VERIFIED"
    }, headers=seeker_headers).json()

    assert claim_res["status"] == "victory"
    assert claim_res["winner_username"] == seeker_name
    assert claim_res["total_pool_ksh"] == 260.0
    assert claim_res["admin_fee_ksh"] == 3.0
    assert claim_res["net_payout_ksh"] == 257.0  # 260 pool - 3 fee

    # 8. Seeker Withdraws Win to M-Pesa
    w_res = client.post("/api/v1/wallet/withdraw", json={
        "phone_number": seeker_phone,
        "amount_ksh": 200
    }, headers=seeker_headers).json()
    assert w_res["status"] == "success"
    assert w_res["net_payout_ksh"] == 197.0  # 200 - 3 admin fee
