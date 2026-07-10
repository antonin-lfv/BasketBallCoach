"""Point d'entrée FastAPI.

En production derrière Caddy, seule l'API est exposée ici.
Avec SERVE_STATIC=1, l'app sert aussi la landing et le build React
(pratique en développement et pour un déploiement mono-conteneur).
"""
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .db import Base, engine
from .routers import auth, folders, systems


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="BasketballCoach API", lifespan=lifespan)

app.include_router(auth.router)
app.include_router(folders.router)
app.include_router(systems.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}


if os.environ.get("SERVE_STATIC") == "1":
    ROOT = Path(os.environ.get("STATIC_ROOT", Path(__file__).resolve().parents[2]))
    DIST = ROOT / "frontend" / "dist"

    if DIST.exists():
        app.mount("/app/assets", StaticFiles(directory=DIST / "assets"), name="app-assets")

        @app.get("/app{path:path}")
        async def spa(path: str):
            # fallback SPA : toute route /app/* renvoie l'index du build React
            candidate = DIST / path.lstrip("/")
            if path and candidate.is_file():
                return FileResponse(candidate)
            return FileResponse(DIST / "index.html")

    @app.get("/")
    async def landing():
        return FileResponse(ROOT / "index.html")

    @app.get("/app.html")
    async def legacy_app():
        return FileResponse(ROOT / "app.html")
