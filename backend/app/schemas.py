"""Schémas Pydantic de l'API."""
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

MAX_DATA_BYTES = 400_000  # ~400 KB par système, largement suffisant


class Credentials(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=8, max_length=200)


class UserOut(BaseModel):
    id: int
    email: str


class FolderIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class FolderOut(BaseModel):
    id: int
    name: str
    systems_count: int = 0


class SystemIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    data: dict[str, Any]
    folder_id: int | None = None


class SystemMeta(BaseModel):
    id: int
    title: str
    folder_id: int | None
    share_token: str | None
    updated_at: datetime


class SystemOut(SystemMeta):
    data: dict[str, Any]


class SharedOut(BaseModel):
    title: str
    data: dict[str, Any]
