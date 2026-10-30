from fastapi import APIRouter, Depends

from app.database.mongodb import database
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/stats")
def get_dashboard_stats(
    project_id: int,
    current_user=Depends(get_current_user)
):
    # Check whether the current user belongs to this project
    membership = database["project_members"].find_one({
        "user_id": current_user["user_id"],
        "project_id": project_id
    })

    if not membership:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this project"
        )

    role = membership.get("role", "member")

    # Fetch selected project tasks only
    if role == "leader":
        tasks = list(
            database["tasks"].find({"project_id": project_id})
        )
    else:
        tasks = list(
            database["tasks"].find({
                "project_id": project_id,
                "assigned_to": current_user["user_id"]
            })
        )

    total_tasks = len(tasks)

    completed_tasks = sum(
        1 for t in tasks if t.get("status") == "completed"
    )

    in_progress_tasks = sum(
        1 for t in tasks if t.get("status") == "in_progress"
    )

    pending_tasks = sum(
        1 for t in tasks if t.get("status") == "pending"
    )

    progress = (
        round((completed_tasks / total_tasks) * 100, 1)
        if total_tasks > 0 else 0
    )

    return {
         "total_projects": len(
        list(database["project_members"].find({
            "user_id": current_user["user_id"]
        }))
    ),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "in_progress_tasks": in_progress_tasks,
        "pending_tasks": pending_tasks,
        "progress_percentage": progress,
        "recent_projects": []
    }
