from fastapi import APIRouter, Depends

from app.database.mongodb import database
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/stats")
def get_dashboard_stats(current_user=Depends(get_current_user)):
    memberships = list(
        database["project_members"].find({"user_id": current_user["user_id"]})
    )

    project_ids = [m["project_id"] for m in memberships]
    projects = (
        list(database["projects"].find({"id": {"$in": project_ids}}))
        if project_ids
        else []
    )
    project_map = {p["id"]: p for p in projects}

    all_visible_tasks = []
    recent_projects = []

    for m in memberships:
        p = project_map.get(m["project_id"])
        if not p:
            continue

        p_id = p["id"]
        role = m.get("role", "member")

        if role == "leader":
            proj_tasks = list(database["tasks"].find({"project_id": p_id}))
        else:
            proj_tasks = list(
                database["tasks"].find({
                    "project_id": p_id,
                    "assigned_to": current_user["user_id"]
                })
            )

        all_visible_tasks.extend(proj_tasks)

        p_completed = len([t for t in proj_tasks if t.get("status") == "completed"])
        p_total = len(proj_tasks)
        p_progress = round((p_completed / p_total) * 100, 1) if p_total > 0 else 0

        recent_projects.append({
            "id": p_id,
            "title": p.get("title", ""),
            "description": p.get("description"),
            "deadline": p.get("deadline"),
            "role": role,
            "total_tasks": p_total,
            "completed_tasks": p_completed,
            "progress": p_progress
        })

    total_projects = len(projects)
    total_tasks = len(all_visible_tasks)

    completed_tasks = len(
        [t for t in all_visible_tasks if t.get("status") == "completed"]
    )
    in_progress_tasks = len(
        [t for t in all_visible_tasks if t.get("status") == "in_progress"]
    )
    pending_tasks = len(
        [t for t in all_visible_tasks if t.get("status") == "pending"]
    )

    progress = 0
    if total_tasks > 0:
        progress = round((completed_tasks / total_tasks) * 100, 1)

    return {
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "pending_tasks": pending_tasks,
        "progress_percentage": progress,
        "recent_projects": recent_projects
    }