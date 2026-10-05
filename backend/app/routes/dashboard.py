from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.project import Project
from app.models.task import Task
from app.models.Project_Member import ProjectMember
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
    memberships = db.query(ProjectMember).filter(
        ProjectMember.user_id == current_user["user_id"]
    ).all()

    project_ids = [m.project_id for m in memberships]
    projects = db.query(Project).filter(Project.id.in_(project_ids)).all() if project_ids else []

    all_visible_tasks = []
    recent_projects = []

    for m in memberships:
        p = next((proj for proj in projects if proj.id == m.project_id), None)
        if not p:
            continue

        if m.role == "leader":
            proj_tasks = db.query(Task).filter(Task.project_id == p.id).all()
        else:
            proj_tasks = db.query(Task).filter(
                Task.project_id == p.id,
                Task.assigned_to == current_user["user_id"]
            ).all()

        all_visible_tasks.extend(proj_tasks)

        p_completed = len([t for t in proj_tasks if t.status == "completed"])
        p_total = len(proj_tasks)
        p_progress = round((p_completed / p_total) * 100, 1) if p_total > 0 else 0

        recent_projects.append({
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "deadline": p.deadline,
            "role": m.role,
            "total_tasks": p_total,
            "completed_tasks": p_completed,
            "progress": p_progress
        })

    total_projects = len(projects)
    total_tasks = len(all_visible_tasks)

    completed_tasks = len(
        [task for task in all_visible_tasks if task.status == "completed"]
    )
    in_progress_tasks = len(
        [task for task in all_visible_tasks if task.status == "in_progress"]
    )
    pending_tasks = len(
        [task for task in all_visible_tasks if task.status == "pending"]
    )

    progress = 0
    if total_tasks > 0:
        progress = round(
            (completed_tasks / total_tasks) * 100,
            1
        )

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "pending_tasks": pending_tasks,
        "progress_percentage": progress,
        "recent_projects": recent_projects
    }