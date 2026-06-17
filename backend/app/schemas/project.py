from pydantic import BaseModel

class ProjectCreate(BaseModel):
    title: str
    description: str | None = None

class ProjectUpdate(BaseModel):
    title: str
    description: str | None = None

