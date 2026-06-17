from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.project import Project
from app.models.task import Task
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    projects = db.query(Project).filter(
        Project.user_id == current_user["user_id"]
    ).all()

    project_ids = [project.id for project in projects]

    tasks = db.query(Task).filter(
        Task.project_id.in_(project_ids)
    ).all()

    total_projects = len(projects)
    total_tasks = len(tasks)

    completed_tasks = len(
        [task for task in tasks if task.status == "completed"]
    )

    pending_tasks = len(
        [task for task in tasks if task.status != "completed"]
    )

    progress = 0

    if total_tasks > 0:
        progress = round(
            (completed_tasks / total_tasks) * 100,
            2
        )

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "progress_percentage": progress
    }