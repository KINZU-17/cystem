# CYSTEM — Real-World Tactical Pursuit & Wagering Platform

Hide. Seek. Win real money. CYSTEM is a real-world outdoor hide-and-seek battle royale with M-Pesa wagering, shrinking storm circles, periodic GPS pings, and live camera-only hints.

---

## Project Structure

```
cystem/
├── client/          # Next.js 16 + Tailwind PWA (game engine from scram-idea)
├── server/          # FastAPI backend (auth, wallet, M-Pesa STK push)
├── nginx/           # Reverse proxy + load balancer config
├── docker-compose.yml
└── .env             # All secrets (never commit)
```

---

## Running Locally

### 1. Backend (FastAPI + SQLite)

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 2. Frontend (Next.js)

```bash
cd client
npm install
npm run dev
```

Open: http://localhost:3000

> For multiplayer, add your Supabase keys to `client/.env.local`, apply `supabase/migrations/001_scram.sql` in your Supabase project, then run the match worker:
> ```bash
> cd client && npm run worker
> ```

---

## Full Production Stack (Docker)

```bash
docker compose up --build
```

Nginx on port 80 → load balances across 2 FastAPI instances → PostgreSQL + Redis + 6-hour DB backups.

---

## Environment Variables

Copy `.env` and fill in:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET_KEY` | Long random string for JWT signing |
| `MPESA_CONSUMER_KEY` | Daraja API consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret |
| `MPESA_SHORTCODE` | M-Pesa paybill/till number |
| `MPESA_PASSKEY` | Daraja passkey |
| `MPESA_CALLBACK_URL` | Public HTTPS URL for STK push callbacks |
| `MPESA_SANDBOX` | `true` for sandbox, `false` for production |
| `APPROVED_PLAY_AREA` | Set `true` after organizer verifies outdoor boundary |

---

## Game Mechanics

- **6-character room code** — host drops a boundary, friends join instantly
- **Shrinking storm** — 6 phases, safe zone closes every 5 minutes
- **Periodic pings** — hunters see a frozen ~40m grid snapshot every 60s
- **1 Point = 130 KSH** — platform takes 3 KSH on withdrawal
- **First-come-first-serve** — first hunter to tag a runner wins the pool
