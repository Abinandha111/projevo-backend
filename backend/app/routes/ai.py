import json
from fastapi import APIRouter, Depends, HTTPException

from app.database.mongodb import database, get_next_id
from app.services.gemini_service import generate_task_breakdown_with_retry
from app.utils.ai_limit import check_ai_limit, increment_ai_usage
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