import secrets
from fastapi import APIRouter, Depends, HTTPException

from app.database.mongodb import database, get_next_id, serialize_doc
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.services.gemini_service import validate_project_idea
from app.utils.dependencies import get_current_user
from app.models.Project_Member import ProjectMember

import os

UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads",
    "attachments"
)

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.post("/")
def create_project(
    project: ProjectCreate,
    current_user=Depends(get_current_user)
):
    # 1. Validate project idea with AI before database creation
    validation = validate_project_idea(project.title, project.description)
    if validation.get("error"):
        raise HTTPException(
            status_code=503,
            detail=validation.get("reason", "Project validation is currently unavailable. Please try again.")
        )
    if not validation.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=validation.get("reason", "Project idea appears invalid or meaningless. Please provide a clear project title and description.")
        )

    invite_code = secrets.token_hex(4)
    project_id = get_next_id("projects")

    new_project = {
        "id": project_id,
        "title": project.title,
        "description": project.description,
        "user_id": current_user["user_id"],
        "invite_code": invite_code,
        "deadline": project.deadline.isoformat() if project.deadline else None,
        "ai_tasks": None
    }
    database["projects"].insert_one(new_project)

    member_id = get_next_id("project_members")
    new_member = {
        "id": member_id,
        "project_id": project_id,
        "user_id": current_user["user_id"],
        "role": "leader"
    }
    database["project_members"].insert_one(new_member)

    user = database["users"].find_one({"id": current_user["user_id"]})
    user_name = user.get("name", "User") if user else "User"

    activity_id = get_next_id("activities")
    activity = {
        "id": activity_id,
        "project_id": project_id,
        "user_id": current_user["user_id"],
        "activity_type": "project_created",
        "message": f'{user_name} created project "{new_project["title"]}"'
    }
    database["activities"].insert_one(activity)

    return {
        "message": "Project created",
        "project": {
            "id": new_project["id"],
            "title": new_project["title"],
            "description": new_project["description"],
            "user_id": new_project["user_id"],
            "invite_code": new_project["invite_code"],
            "deadline": new_project["deadline"]
        }
    }


@router.get("/")
def get_projects(current_user=Depends(get_current_user)):
    memberships = list(database["project_members"].find(
        {"user_id": current_user["user_id"]}
    ))

    project_ids = [m["project_id"] for m in memberships]
    if not project_ids:
        return []

    projects = list(database["projects"].find({"id": {"$in": project_ids}}))
    role_map = {m["project_id"]: m.get("role", "member") for m in memberships}

    result = []
    for project in projects:
        p_id = project["id"]
        member_count = database["project_members"].count_documents({"project_id": p_id})
        tasks = list(database["tasks"].find({"project_id": p_id}))
        completed_tasks = len([t for t in tasks if t.get("status") == "completed"])
        total_tasks = len(tasks)
        progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

        result.append({
            "id": p_id,
            "title": project.get("title", ""),
            "description": project.get("description"),
            "user_id": project.get("user_id"),
            "invite_code": project.get("invite_code"),
            "deadline": project.get("deadline"),
            "ai_tasks": project.get("ai_tasks"),
            "role": role_map.get(p_id, "member"),
            "member_count": member_count,
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "progress": progress
        })

    return result


@router.put("/{project_id}")
def update_project(
    project_id: int,
    project: ProjectUpdate,
    current_user=Depends(get_current_user)
):
    db_project = database["projects"].find_one({
        "id": project_id,
        "user_id": current_user["user_id"]
    })

    if not db_project:
        return {"error": "Project not found"}

    database["projects"].update_one(
        {"id": project_id},
        {"$set": {"title": project.title, "description": project.description}}
    )

    updated_project = database["projects"].find_one({"id": project_id})
    return {
        "message": "Project updated successfully",
        "project": serialize_doc(updated_project)
    }


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    current_user=Depends(get_current_user)
):
    # Only project leader can delete the project
    leader = database["project_members"].find_one({
        "project_id": project_id,
        "user_id": current_user["user_id"],
        "role": "leader"
    })

    if not leader:
        raise HTTPException(
            status_code=403,
            detail="Only the project leader can delete this project"
        )

    project = database["projects"].find_one({"id": project_id})
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    # Get all task IDs belonging to this project
    task_ids = [
        task["id"]
        for task in database["tasks"].find(
            {"project_id": project_id},
            {"id": 1}
        )
    ]

    # Delete uploaded attachment files from disk
    attachments = list(
        database["task_attachments"].find(
            {"project_id": project_id}
        )
    )

    for attachment in attachments:
        file_path = attachment.get("file_path")

        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError as exc:
                raise HTTPException(
                    status_code=500,
                    detail="Could not delete an attachment file. Project was not deleted."
                ) from exc

    # Delete project-related database records
    database["task_attachments"].delete_many(
        {"project_id": project_id}
    )
    database["task_comments"].delete_many(
        {"project_id": project_id}
    )
    database["notifications"].delete_many(
        {"project_id": project_id}
    )
    database["tasks"].delete_many(
        {"project_id": project_id}
    )
    database["project_members"].delete_many(
        {"project_id": project_id}
    )
    database["activities"].delete_many(
        {"project_id": project_id}
    )
    database["projects"].delete_one(
        {"id": project_id}
    )

    return {"message": "Project deleted successfully"}
