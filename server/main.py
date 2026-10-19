from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, wallet, mpesa

app = FastAPI(title="CYSTEM API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(wallet.router)
app.include_router(mpesa.router)

@app.get("/")
def health():
    return {"system": "CYSTEM API", "status": "ok"}
