from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.task import Task
from app.models.project import Project
from app.schemas.task import TaskCreate, TaskStatusUpdate
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_task(
    task: TaskCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == task.project_id,
        Project.user_id == current_user["user_id"]
    ).first()

    if not project:
        return {"error": "Project not found"}

    new_task = Task(
        title=task.title,
        project_id=task.project_id
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return {
        "message": "Task created",
        "task": new_task
    }


@router.get("/{project_id}")
def get_tasks(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user["user_id"]
    ).first()

    if not project:
        return {"error": "Project not found"}

    tasks = db.query(Task).filter(
        Task.project_id == project_id
    ).all()

    return {
        "project_id": project_id,
        "tasks": tasks
    }

@router.put("/{task_id}")
def update_task_status(
    task_id: int,
    task_data: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = db.query(Task).filter(
        Task.id == task_id
    ).first()

    if not task:
        return {"error": "Task not found"}

    project = db.query(Project).filter(
        Project.id == task.project_id,
        Project.user_id == current_user["user_id"]
    ).first()

    if not project:
        return {"error": "Unauthorized"}

    task.status = task_data.status

    db.commit()
    db.refresh(task)

    return {
        "message": "Task updated",
        "task": task
    }

@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    task = db.query(Task).filter(
        Task.id == task_id
    ).first()

    if not task:
        return {"error": "Task not found"}

    project = db.query(Project).filter(
        Project.id == task.project_id,
        Project.user_id == current_user["user_id"]
    ).first()

    if not project:
        return {"error": "Unauthorized"}

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}