import os
import re
import uuid
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads", "attachments")
os.makedirs(UPLOAD_DIR, exist_ok=True)

from app.database.mongodb import database, get_next_id, serialize_doc, serialize_docs
from app.schemas.task import (
    TaskCreate,
    TaskStatusUpdate,
    TaskDeadlineUpdate,
    TaskDescriptionUpdate,
    CommentCreate,
    TaskLabelsUpdate
)
from app.utils.dependencies import get_current_user

from app.services.notification_service import create_notification

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


class AssignTask(BaseModel):
    user_id: int


def _parse_due_date(due_date_val) -> date | None:
    if not due_date_val:
        return None
    if isinstance(due_date_val, date) and not isinstance(due_date_val, datetime):
        return due_date_val
    if isinstance(due_date_val, datetime):
        return due_date_val.date()
    if isinstance(due_date_val, str):
        for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
            try:
                return datetime.strptime(due_date_val, fmt).date()
            except ValueError:
                continue
    return None


@router.get("/my/assigned")
def get_my_assigned_tasks(current_user=Depends(get_current_user)):
    tasks = list(
        database["tasks"]
        .find({"assigned_to": current_user["user_id"]})
        .sort([("epic_order", 1), ("id", 1)])
    )

    return {
        "tasks": serialize_docs(tasks)
    }


@router.put("/{task_id}/assign")
def assign_task(
    task_id: int,
    data: AssignTask,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        return {"message": "Task not found"}

    leader = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"],
        "role": "leader"
    })
    if not leader:
        return {"message": "Only project leader can assign tasks"}

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": data.user_id
    })
    if not member:
        return {"message": "User is not a project member"}

    assigned_user = database["users"].find_one({"id": data.user_id})
    leader_user = database["users"].find_one({"id": current_user["user_id"]})

    leader_name = leader_user.get("name", "Leader") if leader_user else "Leader"
    assigned_name = assigned_user.get("name", "User") if assigned_user else "User"

    database["tasks"].update_one(
        {"id": task_id},
        {"$set": {"assigned_to": data.user_id}}
    )

    activity_id = get_next_id("activities")
    activity = {
        "id": activity_id,
        "project_id": task["project_id"],
        "task_id": task_id,
        "user_id": current_user["user_id"],
        "activity_type": "task_assigned",
        "message": f"{leader_name} assigned {task['title']} to {assigned_name}"
    }
    database["activities"].insert_one(activity)

    create_notification(
        user_id=data.user_id,
        message=f'you have been assigned a new task: "{task["title"]}"',
        notification_type="task_assigned",
        project_id=task["project_id"],
        task_id=task_id
    )

    return {
        "message": "Task assigned successfully",
        "task_id": task_id,
        "assigned_to": data.user_id
    }


@router.post("/")
def create_task(
    task: TaskCreate,
    current_user=Depends(get_current_user)
):
    project = database["projects"].find_one({
        "id": task.project_id,
        "user_id": current_user["user_id"]
    })

    if not project:
        return {"error": "Project not found"}

    task_id = get_next_id("tasks")
    new_task = {
        "id": task_id,
        "title": task.title,
        "epic_order": 0,
        "status": "pending",
        "project_id": task.project_id,
        "assigned_to": None,
        "due_date": str(task.due_date) if task.due_date else None,
        "description": task.description or "",
        "labels": [str(l).strip() for l in task.labels if str(l).strip()] if task.labels else [],
        "source": "manual"
    }

    database["tasks"].insert_one(new_task)

    return {
        "message": "Task created",
        "task": serialize_doc(new_task)
    }


@router.get("/{project_id}")
def get_tasks(
    project_id: int,
    current_user=Depends(get_current_user)
):
    member = database["project_members"].find_one({
        "project_id": project_id,
        "user_id": current_user["user_id"]
    })

    if not member:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this project"
        )

    if member.get("role") == "leader":
        tasks = list(
            database["tasks"]
            .find({"project_id": project_id})
            .sort([("epic_order", 1), ("id", 1)])
        )
    else:
        tasks = list(
            database["tasks"]
            .find({
                "project_id": project_id,
                "assigned_to": current_user["user_id"]
            })
            .sort([("epic_order", 1), ("id", 1)])
        )

    task_results = []
    today = date.today()

    for task in tasks:
        parsed_due = _parse_due_date(task.get("due_date"))

        if task.get("status") == "completed":
            deadline_status = "completed"
        elif parsed_due is None:
            deadline_status = "no_deadline"
        elif parsed_due < today:
            deadline_status = "overdue"
        else:
            deadline_status = "upcoming"

        task_results.append({
            "id": task["id"],
            "title": task.get("title", ""),
            "description": task.get("description", ""),
            "status": task.get("status", "pending"),
            "source": task.get("source", "manual"),
            "due_date": task.get("due_date"),
            "assigned_to": task.get("assigned_to"),
            "epic_order": task.get("epic_order", 0),
            "project_id": task.get("project_id"),
            "labels": task.get("labels", []),
            "deadline_status": deadline_status
        })

    has_ai_breakdown = (
        database["tasks"].count_documents({
            "project_id": project_id,
            "source": "ai"
        }) > 0
    )

    return {
        "project_id": project_id,
        "has_ai_breakdown": has_ai_breakdown,
        "tasks": task_results
    }



@router.put("/{task_id}")
def update_task_status(
    task_id: int,
    task_data: TaskStatusUpdate,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        return {"error": "Task not found"}

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })

    if not member:
        return {"error": "Unauthorized"}

    if member.get("role") != "leader" and task.get("assigned_to") != current_user["user_id"]:
        return {"error": "You can only update your assigned task"}

    old_status = task.get("status")
    database["tasks"].update_one(
        {"id": task_id},
        {"$set": {"status": task_data.status}}
    )

    if task_data.status == "completed" and old_status != "completed":
        user = database["users"].find_one({"id": current_user["user_id"]})
        user_name = user.get("name", "User") if user else "User"

        activity_id = get_next_id("activities")
        activity = {
            "id": activity_id,
            "project_id": task["project_id"],
            "task_id": task_id,
            "user_id": current_user["user_id"],
            "activity_type": "task_completed",
            "message": f'{user_name} completed "{task.get("title", "")}"'
        }
        database["activities"].insert_one(activity)

    updated_task = database["tasks"].find_one({"id": task_id})
    return {
        "message": "Task updated",
        "task": serialize_doc(updated_task)
    }

@router.put("/{task_id}/deadline")
def update_task_deadline(
    task_id:int,
    data:TaskDeadlineUpdate,
    current_user=Depends(get_current_user)
):
    task=database["tasks"].find_one({"id":task_id})

    if not task:
        raise HTTPException(status_code=404,detail="task not found")

    leader = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"],
        "role": "leader"
    })

    if not leader:
        raise HTTPException(
            status_code=403,
            detail="Only the project leader can update the deadline"
        )

    database["tasks"].update_one(
        {"id": task_id},
        {"$set": {
            "due_date": str(data.due_date) if data.due_date else None
        }}
    )

    updated_task = database["tasks"].find_one({"id": task_id})

    return {
        "message": "Task deadline updated successfully",
        "task": serialize_doc(updated_task)
    }




@router.get("/{task_id}/detail")
def get_task_detail(
    task_id: int,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="You are not a member of this project")

    if member.get("role") != "leader" and task.get("assigned_to") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only view tasks assigned to you")

    parsed_due = _parse_due_date(task.get("due_date"))
    today = date.today()
    if task.get("status") == "completed":
        deadline_status = "completed"
    elif parsed_due is None:
        deadline_status = "no_deadline"
    elif parsed_due < today:
        deadline_status = "overdue"
    else:
        deadline_status = "upcoming"

    task_doc = serialize_doc(task)
    task_doc["deadline_status"] = deadline_status

    # Attach assignee name if assigned
    if task.get("assigned_to"):
        assigned_user = database["users"].find_one({"id": task["assigned_to"]})
        task_doc["assignee_name"] = assigned_user.get("name", "User") if assigned_user else "User"
        task_doc["assignee_email"] = assigned_user.get("email", "") if assigned_user else ""
    else:
        task_doc["assignee_name"] = None
        task_doc["assignee_email"] = None

    task_doc["labels"] = task.get("labels") or []

    return {"task": task_doc}


@router.put("/{task_id}/description")
def update_task_description(
    task_id: int,
    data: TaskDescriptionUpdate,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if member.get("role") != "leader" and task.get("assigned_to") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only update your assigned task")

    new_desc = data.description.strip() if data.description else ""

    database["tasks"].update_one(
        {"id": task_id},
        {"$set": {"description": new_desc}}
    )

    updated_task = database["tasks"].find_one({"id": task_id})
    return {
        "message": "Task description updated successfully",
        "task": serialize_doc(updated_task)
    }


@router.put("/{task_id}/labels")
def update_task_labels(
    task_id: int,
    data: TaskLabelsUpdate,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    if member.get("role") != "leader" and task.get("assigned_to") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You can only update labels on your assigned task")

    clean_labels = []
    seen = set()
    for l in (data.labels or []):
        cleaned = str(l).strip()
        if cleaned and cleaned.lower() not in seen:
            if len(cleaned) <= 30:
                clean_labels.append(cleaned)
                seen.add(cleaned.lower())
        if len(clean_labels) >= 10:
            break

    database["tasks"].update_one(
        {"id": task_id},
        {"$set": {"labels": clean_labels}}
    )

    updated_task = database["tasks"].find_one({"id": task_id})
    return {
        "message": "Task labels updated successfully",
        "task": serialize_doc(updated_task)
    }


@router.get("/{task_id}/comments")
def get_task_comments(
    task_id: int,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="You are not authorized to view comments for this task")

    comments = list(
        database["task_comments"]
        .find({"task_id": task_id})
        .sort([("id", 1)])
    )

    return {"comments": serialize_docs(comments)}


@router.post("/{task_id}/comments")
def add_task_comment(
    task_id: int,
    data: CommentCreate,
    current_user=Depends(get_current_user)
):
    

    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="You are not authorized to comment on this task")


    clean_content = data.content.strip()

    if not clean_content:
        raise HTTPException(
            status_code=400,
            detail="Comment cannot be empty"
        )

    user = database["users"].find_one({"id": current_user["user_id"]})
    user_name = user.get("name", "User") if user else "User"



    comment_id = get_next_id("task_comments")
    now_iso = datetime.now().isoformat()

    new_comment = {
        "id": comment_id,
        "task_id": task_id,
        "project_id": task["project_id"],
        "user_id": current_user["user_id"],
        "user_name": user_name,
        "content": clean_content,
        "created_at": now_iso
    }

    database["task_comments"].insert_one(new_comment)

    # Log to activities
    activity_id = get_next_id("activities")
    activity = {
        "id": activity_id,
        "project_id": task["project_id"],
        "task_id": task_id,
        "user_id": current_user["user_id"],
        "activity_type": "task_comment",
        "message": f'{user_name} commented on "{task.get("title", "Task")}"'
    }
    database["activities"].insert_one(activity)

    return {
        "message": "Comment added successfully",
        "comment": serialize_doc(new_comment)
    }


@router.delete("/{task_id}/comments/{comment_id}")
def delete_task_comment(
    task_id: int,
    comment_id: int,
    current_user=Depends(get_current_user)
):
    comment = database["task_comments"].find_one({"id": comment_id, "task_id": task_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    member = database["project_members"].find_one({
        "project_id": comment["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    is_author = comment["user_id"] == current_user["user_id"]
    is_leader = member.get("role") == "leader"

    if not is_author and not is_leader:
        raise HTTPException(status_code=403, detail="You can only delete your own comments")

    database["task_comments"].delete_one({"id": comment_id})
    return {"message": "Comment deleted successfully"}


@router.get("/{task_id}/attachments")
def get_task_attachments(
    task_id: int,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    attachments = list(
        database["task_attachments"]
        .find({"task_id": task_id})
        .sort([("id", -1)])
    )
    return {"attachments": serialize_docs(attachments)}


@router.post("/{task_id}/attachments")
async def upload_task_attachment(
    task_id: int,
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    original_filename = file.filename or "attachment"
    clean_filename = os.path.basename(original_filename)
    clean_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', clean_filename)
    if not clean_filename:
        clean_filename = "attachment"

    MAX_FILE_SIZE = 15 * 1024 * 1024
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File size exceeds 15MB limit")
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Cannot upload empty file")

    attachment_id = get_next_id("task_attachments")
    unique_prefix = uuid.uuid4().hex[:8]
    stored_filename = f"{task_id}_{attachment_id}_{unique_prefix}_{clean_filename}"
    file_path = os.path.join(UPLOAD_DIR, stored_filename)

    with open(file_path, "wb") as f:
        f.write(content)

    user = database["users"].find_one({"id": current_user["user_id"]})
    uploader_name = user.get("name", "User") if user else "User"

    attachment_doc = {
        "id": attachment_id,
        "task_id": task_id,
        "project_id": task["project_id"],
        "user_id": current_user["user_id"],
        "uploader_name": uploader_name,
        "filename": clean_filename,
        "file_size": file_size,
        "content_type": file.content_type or "application/octet-stream",
        "file_path": file_path,
        "created_at": datetime.utcnow().isoformat()
    }

    database["task_attachments"].insert_one(attachment_doc)

    return {
        "message": "File uploaded successfully",
        "attachment": serialize_doc(attachment_doc)
    }


@router.get("/{task_id}/attachments/{attachment_id}/download")
def download_task_attachment(
    task_id: int,
    attachment_id: int,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    attachment = database["task_attachments"].find_one({
        "id": attachment_id,
        "task_id": task_id
    })
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    file_path = attachment.get("file_path")
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Attachment file not found on disk")

    return FileResponse(
        path=file_path,
        filename=attachment.get("filename", "download"),
        media_type=attachment.get("content_type", "application/octet-stream")
    )


@router.delete("/{task_id}/attachments/{attachment_id}")
def delete_task_attachment(
    task_id: int,
    attachment_id: int,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    member = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"]
    })
    if not member:
        raise HTTPException(status_code=403, detail="Unauthorized")

    attachment = database["task_attachments"].find_one({
        "id": attachment_id,
        "task_id": task_id
    })
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")

    is_uploader = attachment.get("user_id") == current_user["user_id"]
    is_leader = member.get("role") == "leader"

    if not is_uploader and not is_leader:
        raise HTTPException(status_code=403, detail="You can only delete attachments you uploaded")

    file_path = attachment.get("file_path")
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    database["task_attachments"].delete_one({"id": attachment_id})
    return {"message": "Attachment deleted successfully"}


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    current_user=Depends(get_current_user)
):
    task = database["tasks"].find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    leader = database["project_members"].find_one({
        "project_id": task["project_id"],
        "user_id": current_user["user_id"],
        "role": "leader"
    })

    if not leader:
        raise HTTPException(
            status_code=403,
            detail="Only the project leader can delete tasks"
        )

    # Delete attachment files from disk
    attachments = list(
        database["task_attachments"].find({"task_id": task_id})
    )

    for attachment in attachments:
        file_path = attachment.get("file_path")

        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError as exc:
                raise HTTPException(
                    status_code=500,
                    detail="Could not delete an attachment file. Task was not deleted."
                ) from exc

    # Delete related database records
    database["task_attachments"].delete_many({"task_id": task_id})
    database["task_comments"].delete_many({"task_id": task_id})
    database["activities"].delete_many({"task_id": task_id})
    database["notifications"].delete_many({"task_id": task_id})

    # Existing activity records cannot reliably be linked to this task
    # because they currently do not store task_id.
    database["tasks"].delete_one({"id": task_id})

    return {"message": "Task deleted successfully"}
