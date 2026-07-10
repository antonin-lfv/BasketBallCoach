"""CRUD des systèmes de jeu + liens de partage."""
import json
import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..deps import get_current_user
from ..models import Folder, System, User
from ..schemas import MAX_DATA_BYTES, SharedOut, SystemIn, SystemMeta, SystemOut

router = APIRouter(prefix="/api", tags=["systems"])


def _check_payload(body: SystemIn) -> None:
    if len(json.dumps(body.data)) > MAX_DATA_BYTES:
        raise HTTPException(413, "Système trop volumineux")
    if body.data.get("app") != "basketballcoach-web" or not isinstance(body.data.get("phases"), list):
        raise HTTPException(400, "Format de système non reconnu")


async def _own_system(system_id: int, user: User, db: AsyncSession) -> System:
    system = await db.get(System, system_id)
    if system is None or system.user_id != user.id:
        raise HTTPException(404, "Système introuvable")
    return system


async def _check_folder(folder_id: int | None, user: User, db: AsyncSession) -> None:
    if folder_id is None:
        return
    folder = await db.get(Folder, folder_id)
    if folder is None or folder.user_id != user.id:
        raise HTTPException(400, "Dossier invalide")


def _meta(s: System) -> SystemMeta:
    return SystemMeta(
        id=s.id, title=s.title, folder_id=s.folder_id,
        share_token=s.share_token, updated_at=s.updated_at,
    )


@router.get("/systems", response_model=list[SystemMeta])
async def list_systems(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.scalars(
            select(System).where(System.user_id == user.id).order_by(System.updated_at.desc())
        )
    ).all()
    return [_meta(s) for s in rows]


@router.post("/systems", response_model=SystemOut)
async def create_system(body: SystemIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    _check_payload(body)
    await _check_folder(body.folder_id, user, db)
    system = System(user_id=user.id, title=body.title.strip(), data=body.data, folder_id=body.folder_id)
    db.add(system)
    await db.commit()
    return SystemOut(**_meta(system).model_dump(), data=system.data)


@router.get("/systems/{system_id}", response_model=SystemOut)
async def get_system(system_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    system = await _own_system(system_id, user, db)
    return SystemOut(**_meta(system).model_dump(), data=system.data)


@router.put("/systems/{system_id}", response_model=SystemOut)
async def update_system(
    system_id: int, body: SystemIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    _check_payload(body)
    await _check_folder(body.folder_id, user, db)
    system = await _own_system(system_id, user, db)
    system.title = body.title.strip()
    system.data = body.data
    system.folder_id = body.folder_id
    await db.commit()
    return SystemOut(**_meta(system).model_dump(), data=system.data)


@router.delete("/systems/{system_id}")
async def delete_system(system_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    system = await _own_system(system_id, user, db)
    await db.delete(system)
    await db.commit()
    return {"ok": True}


@router.post("/systems/{system_id}/share", response_model=SystemMeta)
async def enable_share(system_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    system = await _own_system(system_id, user, db)
    if not system.share_token:
        system.share_token = secrets.token_urlsafe(12)
        await db.commit()
    return _meta(system)


@router.delete("/systems/{system_id}/share", response_model=SystemMeta)
async def disable_share(system_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    system = await _own_system(system_id, user, db)
    system.share_token = None
    await db.commit()
    return _meta(system)


@router.get("/shared/{token}", response_model=SharedOut)
async def get_shared(token: str, db: AsyncSession = Depends(get_db)):
    system = await db.scalar(select(System).where(System.share_token == token))
    if system is None:
        raise HTTPException(404, "Lien de partage invalide ou révoqué")
    return SharedOut(title=system.title, data=system.data)
