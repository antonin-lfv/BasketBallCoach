"""Inscription, connexion, déconnexion, profil."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..deps import COOKIE_NAME, clear_session_cookie, get_current_user, set_session_cookie
from ..models import AuthSession, User
from ..schemas import Credentials, PasswordChange, UserOut
from ..security import hash_password, valid_email, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut)
async def register(body: Credentials, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    if not valid_email(email):
        raise HTTPException(400, "Adresse email invalide")
    exists = await db.scalar(select(func.count()).select_from(User).where(User.email == email))
    if exists:
        raise HTTPException(409, "Un compte existe déjà avec cette adresse")
    user = User(email=email, password_hash=hash_password(body.password))
    db.add(user)
    await db.flush()
    sess = AuthSession(user_id=user.id)
    db.add(sess)
    await db.commit()
    set_session_cookie(response, sess.token, request)
    return UserOut(id=user.id, email=user.email)


@router.post("/login", response_model=UserOut)
async def login(body: Credentials, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    email = body.email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    sess = AuthSession(user_id=user.id)
    db.add(sess)
    await db.commit()
    set_session_cookie(response, sess.token, request)
    return UserOut(id=user.id, email=user.email)


@router.post("/password")
async def change_password(
    body: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current, user.password_hash):
        raise HTTPException(400, "Mot de passe actuel incorrect")
    user.password_hash = hash_password(body.new)
    await db.commit()
    return {"ok": True}


@router.post("/logout")
async def logout(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        sess = await db.get(AuthSession, token)
        if sess:
            await db.delete(sess)
            await db.commit()
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email)
