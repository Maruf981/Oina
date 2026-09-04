from pydantic import BaseModel


class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: int | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryOut(CategoryBase):
    id: int
    is_archived: bool = False

    class Config:
        from_attributes = True