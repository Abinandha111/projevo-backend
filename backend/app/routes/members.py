from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database.mongodb import database, get_next_id
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/members",
    tags=["Members"]
)


class JoinProject(BaseModel):
    invite_code: str


@router.get("/{project_id}")
def get_project_members(
    project_id: int,
    current_user=Depends(get_current_user)
):
    # Verify current user is a member of this project
    is_member = database["project_members"].find_one({
        "project_id": project_id,
        "user_id": current_user["user_id"]
    })

    if not is_member:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this project"
        )

    members = list(database["project_members"].find({"project_id": project_id}))
    user_ids = [m["user_id"] for m in members]

    users = list(database["users"].find({"id": {"$in": user_ids}}))
    user_map = {u["id"]: u for u in users}

    return [
        {
            "id": member["id"],
            "user_id": member["user_id"],
            "name": user_map.get(member["user_id"], {}).get("name", ""),
            "email": user_map.get(member["user_id"], {}).get("email", ""),
            "role": member.get("role", "member")
        }
        for member in members
    ]


@router.post("/join")
def join_project(
    data: JoinProject,
    current_user=Depends(get_current_user)
):
    project = database["projects"].find_one({
        "invite_code": data.invite_code
    })

    if not project:
        return {
            "message": "Invalid invite code"
        }

    existing_member = database["project_members"].find_one({
        "project_id": project["id"],
        "user_id": current_user["user_id"]
    })

    if existing_member:
        return {
            "message": "Already a member"
        }

    user = database["users"].find_one({
        "id": current_user["user_id"]
    })
    user_name = user.get("name", "User") if user else "User"

    member_id = get_next_id("project_members")
    new_member = {
        "id": member_id,
        "project_id": project["id"],
        "user_id": current_user["user_id"],
        "role": "member"
    }
    database["project_members"].insert_one(new_member)

    activity_id = get_next_id("activities")
    activity = {
        "id": activity_id,
        "project_id": project["id"],
        "user_id": current_user["user_id"],
        "activity_type": "member_joined",
        "message": f"{user_name} joined the project"
    }
    database["activities"].insert_one(activity)

    return {
        "message": "Joined project successfully"
    }