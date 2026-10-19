import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base
# Import all models to ensure schema registration
import app.models

# Import routers
from app.routers.auth import router as auth_router
from app.routers.wallet import router as wallet_router
from app.routers.matchmaking import router as matchmaking_router
from app.routers.game import router as game_router
from app.routers.websockets import router as websockets_router
from app.routers.admin import router as admin_router

# Configure sanitized logging
logging.basicConfig(
    level=logging.INFO if settings.DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("cystem.server")

# Auto-create tables on launch
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CYSTEM Tactical Pursuit Engine",
    description="High-stakes real-world hide-and-seek battle royale backend with M-Pesa wagering and live optical verification.",
    version="1.0.0"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Production Error Handler (Leak Prevention)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error processing {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal operational error occurred. Please try again."}
    )

# Include Routers
app.include_router(auth_router)
app.include_router(wallet_router)
app.include_router(matchmaking_router)
app.include_router(game_router)
app.include_router(websockets_router)
app.include_router(admin_router)

@app.get("/")
def health_check():
    return {
        "system": "CYSTEM Master Engine",
        "status": "Operational 🟢",
        "version": "1.0.0",
        "financial_peg": f"1 Point = {settings.POINTS_TO_KSH_RATE} KSH",
        "admin_fee": f"{settings.ADMIN_WITHDRAWAL_FEE_KSH} KSH per settlement",
        "anti_cheat": "Active (Haversine Spatial Verification & EXIF Filters)"
    }
