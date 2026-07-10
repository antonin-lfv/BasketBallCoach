"""Dépendances FastAPI : utilisateur courant via cookie de session."""
import os
from datetime import timedelta

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_db
from .models import AuthSession, User, utcnow

COOKIE_NAME = "bball_session"
SESSION_DAYS = 30


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        COOKIE_NAME,
        token,
        max_age=SESSION_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=os.environ.get("COOKIE_SECURE", "1") != "0",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


async def get_current_user_optional(
    request: Request, db: AsyncSession = Depends(get_db)
) -> User | None:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        return None
    sess = await db.get(AuthSession, token)
    if sess is None:
        return None
    now = utcnow()
    expires = sess.expires_at
    if expires.tzinfo is None:  # SQLite stocke en naïf
        from datetime import timezone
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < now:
        await db.delete(sess)
        await db.commit()
        return None
    # session glissante : prolonger si moins de 15 jours restants
    if expires - now < timedelta(days=SESSION_DAYS / 2):
        sess.expires_at = now + timedelta(days=SESSION_DAYS)
        await db.commit()
    return await db.get(User, sess.user_id)


async def get_current_user(
    user: User | None = Depends(get_current_user_optional),
) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Connexion requise")
    return user
