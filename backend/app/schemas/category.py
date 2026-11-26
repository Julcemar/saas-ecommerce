from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True
    parent_id: Optional[UUID] = None
    seo_title: Optional[str] = Field(default=None, max_length=70)
    seo_description: Optional[str] = Field(default=None, max_length=160)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    parent_id: Optional[UUID] = None
    seo_title: Optional[str] = Field(default=None, max_length=70)
    seo_description: Optional[str] = Field(default=None, max_length=160)


class CategoryReorderItem(BaseModel):
    id: UUID
    display_order: int
    parent_id: Optional[UUID] = None


class CategoryResponse(CategoryBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    products_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
