from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.database.mongodb import database, get_next_id, serialize_doc, serialize_docs
from app.schemas.task import TaskCreate, TaskStatusUpdate, TaskDeadlineUpdate
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
            "status": task.get("status", "pending"),
            "due_date": task.get("due_date"),
            "assigned_to": task.get("assigned_to"),
            "epic_order": task.get("epic_order", 0),
            "project_id": task.get("project_id"),
            "deadline_status": deadline_status
        })

    return {
        "project_id": project_id,
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
        raise HTTPException(status_code=403, detail="Only the project leader can delete tasks")

    database["tasks"].delete_one({"id": task_id})
    return {"message": "Task deleted successfully"}