from datetime import date
from pydantic import BaseModel

class TaskCreate(BaseModel):
    title: str
    project_id: int
    due_date: date | None = None

class TaskStatusUpdate(BaseModel):
    status: str