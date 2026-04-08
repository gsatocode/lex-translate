import asyncio
import re
import uuid
from datetime import datetime, timezone, timedelta

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import jwt
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import settings
from api.dependencies import get_db
from api.models.user import Organization, User
from api.schemas.auth import LoginRequest, RegisterRequest, TokenResponse

limiter = Limiter(key_func=get_remote_address)

router = APIRouter()

_UNAUTHORIZED = {"WWW-Authenticate": "Bearer"}


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm="HS256")


def _slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    slug = _slugify(payload.org_name)
    if not slug:
        raise HTTPException(status_code=400, detail="org_name must contain alphanumeric characters")

    existing_org = await db.execute(
        select(Organization).where(Organization.slug == slug)
    )
    if existing_org.scalar_one_or_none():
        slug = f"{slug}-{str(uuid.uuid4())[:8]}"

    org = Organization(name=payload.org_name, slug=slug)
    db.add(org)
    await db.flush()

    hashed = await asyncio.to_thread(_hash_password, payload.password)
    user = User(
        org_id=org.id,
        email=payload.email,
        hashed_password=hashed,
        role="owner",
    )
    db.add(user)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")

    return TokenResponse(access_token=_create_token(user.id), token_type="bearer")


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers=_UNAUTHORIZED,
        )
    ok = await asyncio.to_thread(_verify_password, payload.password, user.hashed_password)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers=_UNAUTHORIZED,
        )
    return TokenResponse(access_token=_create_token(user.id), token_type="bearer")
