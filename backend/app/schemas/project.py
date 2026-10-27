from pydantic import BaseModel,Field,field_validator
from datetime import date

class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100, strip_whitespace=True)
    description: str | None = Field(default=None, max_length=2000)
    deadline:date | None = None

    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value):
        return value.strip() if isinstance(value, str) else value

class ProjectUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=100, strip_whitespace=True)
    description: str | None = Field(default=None, max_length=2000)
    @field_validator("title", mode="before")
    @classmethod
    def strip_title(cls, value):
        return value.strip() if isinstance(value, str) else value

