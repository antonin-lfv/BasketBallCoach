"""Dossiers de rangement des systèmes."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..deps import get_current_user
from ..models import Folder, System, User
from ..schemas import FolderIn, FolderOut

router = APIRouter(prefix="/api/folders", tags=["folders"])


@router.get("", response_model=list[FolderOut])
async def list_folders(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Folder, func.count(System.id))
            .outerjoin(System, System.folder_id == Folder.id)
            .where(Folder.user_id == user.id)
            .group_by(Folder.id)
            .order_by(Folder.name)
        )
    ).all()
    return [FolderOut(id=f.id, name=f.name, systems_count=c) for f, c in rows]


@router.post("", response_model=FolderOut)
async def create_folder(body: FolderIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    folder = Folder(user_id=user.id, name=body.name.strip())
    db.add(folder)
    await db.commit()
    return FolderOut(id=folder.id, name=folder.name, systems_count=0)


async def _own_folder(folder_id: int, user: User, db: AsyncSession) -> Folder:
    folder = await db.get(Folder, folder_id)
    if folder is None or folder.user_id != user.id:
        raise HTTPException(404, "Dossier introuvable")
    return folder


@router.patch("/{folder_id}", response_model=FolderOut)
async def rename_folder(
    folder_id: int, body: FolderIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    folder = await _own_folder(folder_id, user, db)
    folder.name = body.name.strip()
    await db.commit()
    count = await db.scalar(select(func.count()).select_from(System).where(System.folder_id == folder.id))
    return FolderOut(id=folder.id, name=folder.name, systems_count=count or 0)


@router.delete("/{folder_id}")
async def delete_folder(folder_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    folder = await _own_folder(folder_id, user, db)
    await db.delete(folder)  # les systèmes repassent hors dossier (SET NULL)
    await db.commit()
    return {"ok": True}
