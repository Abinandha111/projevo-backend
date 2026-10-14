from fastapi import APIRouter, Depends
from app.models.Project_Member import ProjectMember
from app.database.mongodb import database, serialize_docs
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/activities",
    tags=["Activities"]
)


@router.get("/recent")
def get_recent_activities(current_user=Depends(get_current_user)):
    memberships = list(
        database["project_members"].find({"user_id": current_user["user_id"]})
    )

    project_ids = [m["project_id"] for m in memberships]
    if not project_ids:
        return {
            "activities": []
        }

    activities = list(
        database["activities"]
        .find({"project_id": {"$in": project_ids}})
        .sort([("id", -1)])
        .limit(10)
    )

    return {
        "activities": serialize_docs(activities)
    }