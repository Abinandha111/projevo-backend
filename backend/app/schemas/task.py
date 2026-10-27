from datetime import date
from pydantic import BaseModel,Field
from typing import Literal

class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100, strip_whitespace=True)
    project_id: int
    due_date: date | None = None
    description: str | None = None
    labels: list[str] = []

class TaskStatusUpdate(BaseModel):
    status: Literal["pending", "in_progress", "completed"]


class TaskDeadlineUpdate(BaseModel):
    due_date: date | None = None


class TaskDescriptionUpdate(BaseModel):
    description: str | None = None


class CommentCreate(BaseModel):
    content: str  = Field(min_length=1, max_length=1000, strip_whitespace=True)


class TaskLabelsUpdate(BaseModel):
    labels: list[str] = Field(default_factory=list, max_length=10)
