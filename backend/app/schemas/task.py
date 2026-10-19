from datetime import date
from pydantic import BaseModel

class TaskCreate(BaseModel):
    title: str
    project_id: int
    due_date: date | None = None
    description: str | None = None
    labels: list[str] = []

class TaskStatusUpdate(BaseModel):
    status: str


class TaskDeadlineUpdate(BaseModel):
    due_date: date | None = None


class TaskDescriptionUpdate(BaseModel):
    description: str | None = None


class CommentCreate(BaseModel):
    content: str


class TaskLabelsUpdate(BaseModel):
    labels: list[str] = []
