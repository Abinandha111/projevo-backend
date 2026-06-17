from pydantic import BaseModel

class TaskCreate(BaseModel):
    title: str
    project_id: int

class TaskStatusUpdate(BaseModel):
    status: str