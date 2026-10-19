# CYSTEM — Real-World Tactical Pursuit & Wagering Platform

CYSTEM is a high-stakes, real-world outdoor tactical hide-and-seek battle royale. It blends elements of **tactical geocaching** (shrinking storm circles, supply drops, periodic quantized GPS pings), **ephemeral snap verification** (live camera-only hints, strict hardware EXIF checks to prohibit camera-roll uploads), and **mobile micro-wagering** (Safaricom Daraja M-Pesa STK Push deposits, B2C automated payouts, and a 130 KSH point peg with a 3 KSH platform commission).

---

## 🎮 Core Game Mechanics

1. **6-Character Room Matchmaking**:
   - One operative hosts an arena by dropping a coordinate anchor, setting round duration (5–120 min), radius (100–3000m), and entry stakes (e.g., KSH 130 = 1 Point).
   - Friends join instantly using the 6-character room code (e.g., `A7K9X2`) and pick their role (**Hunter**, **Runner/Hider**, or **Random** for auto-balancing).

2. **Live Snap-Hints Only**:
   - The Hider must post live photo/video hints directly using the device camera.
   - Phone gallery uploads are strictly blocked. Binary EXIF metadata verifies capture within the last 60 seconds.

3. **Shrinking Storm Safe Zones**:
   - Inspired by battle-royale mechanics, the playable safe zone shrinks every 5 minutes across 6 distinct phases (`500m → 350m → 220m → 120m → 50m → 20m`).
   - Straying outside the safe zone causes escalating storm damage.

4. **Periodic Quantized Radar Pings**:
   - Hunters do not receive a continuous cheat feed. Instead, every few minutes, the radar sweeps and drops a frozen ping snapped to a 40m grid.
   - When within close range (< 100m), the seeker's **Hot/Cold Proximity Radar** pulses dynamically from *Freezing* to *Warming Up*, *Hot Zone*, and *Boiling*.

5. **First-Come-First-Serve Settlement & Escrow**:
   - **Seeker Win**: First seeker to spot the hider and verify within 20m claims the entire escrow pool.
   - **Hider Win**: If the hider survives until the countdown timer expires, the entire pool is awarded to the hider.
   - **Platform Commission**: A flat **3 KSH** platform cut is deducted upon final withdrawal/settlement.

---

## 🏛️ System Architecture

```
cystem/
├── client/                     # React + Vite + Tailwind CSS Tactical HUD PWA
│   ├── src/
│   │   ├── components/
│   │   │   ├── WelcomeCystem.tsx     # Onboarding & rules briefing
│   │   │   ├── AuthModal.tsx         # HaveIBeenPwned & password validator
│   │   │   ├── GameLobby.tsx         # 6-character room codes & role balancer
│   │   │   ├── TacticalMap.tsx       # Shrinking storm circles & radar sweep
│   │   │   ├── ActiveGameHUD.tsx     # Mission Control HUD with live timer
│   │   │   ├── HotColdRadar.tsx      # Dynamic proximity distance feedback
│   │   │   ├── CameraCapture.tsx     # Device camera viewfinder & optical claim
│   │   │   ├── WalletDeposit.tsx     # M-Pesa STK Push top-up & B2C withdrawals
│   │   │   ├── WinnerModal.tsx       # Settlement breakdown & celebration
│   │   │   └── AdminDisputePanel.tsx # Operations metrics & dispute resolution
│   │   ├── lib/                      # API client and WebSocket manager
│   │   └── App.tsx                   # Master Switchboard
│
├── server/                     # High-Concurrency FastAPI Backend
│   ├── app/
│   │   ├── core/                     # Config, SQLite/Postgres DB & Security
│   │   ├── models/                   # User, Wallet, GameMatch, Dispute
│   │   ├── routers/                  # Auth, Wallet, Matchmaking, Game, WS, Admin
│   │   ├── services/                 # Haversine Geofencing, EXIF, M-Pesa, SMS
│   │   └── main.py                   # FastAPI Application Entrypoint
│   ├── requirements.txt
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf              # Round-robin load balancer & WebSocket proxy
├── docker-compose.yml          # Multi-container global infrastructure
├── .env.example                # Documented configuration variables
└── .gitignore
```

---

## 🔒 Security Hardening Compliance (Plan-out/About.md)

| Audit Domain | Implementation |
|---|---|
| **1. Password Hashing** | Bcrypt using `passlib` with cost factor 12. Never stored plain-text. |
| **2. Password Rules** | Enforced: 8+ characters, at least 1 digit, 1 uppercase letter, 1 special character. |
| **3. Breach Detection** | Direct integration with **HaveIBeenPwned k-Anonymity API** during registration. |
| **4. Credentials & Keys** | All API keys and secrets stored exclusively in `.env` files; ignored in Git. |
| **5. Sanitized Logging** | Production logs strip coordinates, request bodies, passwords, and phone numbers. |
| **6. Error Handling** | Global exception handler sanitizes all errors; zero stack traces or file paths leaked. |
| **7. Dependency Auditing** | Fully audited packages pinned with minimum attack surfaces. |

---

## 🚀 Running Locally

### Option 1: Standalone Python Backend & SQLite

```bash
# In ~/Desktop/cystem
cd server
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/`

### Option 2: Running the Tactical Frontend

```bash
cd client
npm install
npm run dev
```
- Open `http://localhost:5173` in your mobile or desktop browser.

---

## 🌐 Full Production Multi-Container Stack (Docker)

To run the complete production ecosystem (Nginx Load Balancer, 2x FastAPI backend instances, PostgreSQL with automated 6-hour backup cron, and Redis caching):

```bash
docker compose up --build
```

Nginx will capture traffic on `http://localhost:80`, distribute requests across `backend-1` and `backend-2`, maintain real-time WebSocket state, and persist all financial transactions to PostgreSQL.
