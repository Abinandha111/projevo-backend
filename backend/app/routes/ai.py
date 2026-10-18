import json
from fastapi import APIRouter, Depends, HTTPException

from app.database.mongodb import database, get_next_id
from app.services.gemini_service import (generate_task_breakdown_with_retry,generate_project_summary)
from app.utils.ai_limit import check_ai_limit, increment_ai_usage, reset_if_needed
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])


def safe_parse_ai(ai_text: str):
    try:
        return json.loads(ai_text)
    except Exception:
        return None


# ---------------- BREAKDOWN ----------------
@router.get("/breakdown")
def ai_breakdown(project_name: str):
    ai_tasks = generate_task_breakdown_with_retry(project_name)

    if ai_tasks is None:
        return {
            "message": "AI service temporarily unavailable",
            "ai_tasks": []
        }

    return {
        "project": project_name,
        "ai_tasks": ai_tasks
    }


# ---------------- MAIN ----------------
@router.post("/generate-tasks")
def generate_and_save_tasks(
    project_id: int,
    user=Depends(get_current_user)
):
    db_user = database["users"].find_one({"id": user["user_id"]})

    if not db_user:
        return {"error": "User not found"}

    print(
    "AI DEBUG:",
    "user_id =", db_user.get("id"),
    "usage =", db_user.get("ai_usage_count", 0),
    "cooldown =", db_user.get("ai_cooldown_until")
    )

    # AI LIMIT CHECK
    if not check_ai_limit(db_user):
        raise HTTPException(status_code=429, detail="AI limit exceeded")

    project = database["projects"].find_one({"id": project_id})

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    leader = database["project_members"].find_one({
        "project_id": project_id,
        "user_id": user["user_id"],
        "role": "leader"
    })

    if not leader:
        raise HTTPException(status_code=403, detail="Only the project leader can generate AI tasks")

    # GEMINI CALL
    ai_tasks = generate_task_breakdown_with_retry(project.get("title", ""))

    if ai_tasks is None:
        return {
            "message": "AI service unavailable",
            "saved_tasks": []
        }

    print("\n===== GEMINI RESPONSE =====")
    print(ai_tasks)
    print("==========================\n")

    # PARSE JSON
    structured_ai = safe_parse_ai(ai_tasks)

    if structured_ai is None or "epics" not in structured_ai:
        return {
            "message": "AI returned invalid structure",
            "saved_tasks": []
        }

    # SAVE CACHE
    database["projects"].update_one(
        {"id": project_id},
        {"$set": {"ai_tasks": ai_tasks}}
    )

    # INCREMENT USAGE
    increment_ai_usage(db_user)

    # SAVE TASKS
    saved_tasks = []

    for epic_index, epic in enumerate(
        structured_ai.get("epics", []),
        start=1
    ):
        epic_name = epic.get("name", "General")

        for task in epic.get("tasks", []):
            clean_task = f"[{epic_name}] {task}"

            existing_task = database["tasks"].find_one({
                "project_id": project_id,
                "title": clean_task
            })

            if existing_task:
                database["tasks"].update_one(
                    {"id": existing_task["id"]},
                    {"$set": {"epic_order": epic_index}}
                )
            else:
                task_id = get_next_id("tasks")
                new_task = {
                    "id": task_id,
                    "title": clean_task,
                    "project_id": project_id,
                    "status": "pending",
                    "epic_order": epic_index,
                    "assigned_to": None,
                    "due_date": None
                }
                database["tasks"].insert_one(new_task)
                saved_tasks.append(clean_task)

    return {
        "message": "AI generated + cached successfully",
        "saved_tasks": ai_tasks
    }

# ---------PROJECT SUMMARY ---------
@router.get("/project-summary/{project_id}")
def get_project_summary(
    project_id:int,
    user=Depends(get_current_user)
):
    # 1. Check whether the project exists
    project = database["projects"].find_one({
        "id":project_id
    })

    if not project:
        raise HTTPException(status_code=404,detail="project not found")

    # 2. Check whether the user is a project member
    member = database["project_members"].find_one({
        "project_id":project_id,
        "user_id":user["user_id"]
    })

    if not member:
        raise HTTPException(status_code=403,detail="you are not a member of this project ")

    # 3. fetch the projects actual tasks
    tasks = list(database["tasks"].find(
        {"project_id":project_id},
        {
            
            "title":1,
            "status":1,
            "due_date":1
        }
    ))

    # 4. Prepare project progress information 
    total_tasks = len(tasks)
    completed_tasks = sum(
        1 for task in tasks
        if task.get("status") == "completed"
    )
    pending_tasks = total_tasks - completed_tasks

    project_data = {
        "project_title":project.get("title", ""),
        "project_description":project.get("description", ""),
        "project_deadline": project.get("deadline"),
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "progress_percentage": round(
            completed_tasks / total_tasks * 100,1
        ) if total_tasks else 0,
        "tasks":tasks
    }

    # 5. Generate the AI summary
    summary = generate_project_summary(project_data)

    if not summary:
        raise HTTPException(status_code=503,detail="Ai summary is temporarily unavailable")

    return {
        "project_id": project_id,
        "project_title": project.get("title", ""),
        "summary": summary,
         "progress": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "pending_tasks": pending_tasks,
            "percentage": project_data["progress_percentage"]
        }
    }


# --------- AI USAGE STATUS ---------
@router.get("/usage")
def get_ai_usage(user=Depends(get_current_user)):
    db_user = database["users"].find_one({
        "id": user["user_id"]
    })

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Reset usage if the cooldown has expired
    reset_if_needed(db_user)

    usage_count = db_user.get("ai_usage_count", 0)
    remaining = max(0, 20 - usage_count)

    return {
        "used": usage_count,
        "remaining": remaining,
        "limit": 20,
        "cooldown_until": db_user.get("ai_cooldown_until")
    }
