import json
import re

from typing import List
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException

from app.database.mongodb import database, get_next_id
from app.services.gemini_service import (generate_task_breakdown_with_retry,generate_project_summary,generate_epic_tasks_with_retry)
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

   

    # SAVE NEW AI RESPONSE
    database["projects"].update_one(
        {"id": project_id},
        {"$set": {"ai_tasks": ai_tasks}}
    )

    # INCREMENT USAGE
    increment_ai_usage(db_user)

    

           
    

        # SAVE NEW AI TASKS AND PRESERVE EXISTING TASK DETAILS
    saved_tasks = []

    for epic_index, epic in enumerate(
        structured_ai.get("epics", []),
        start=1
    ):
        epic_name = epic.get("name", "General")

        for task in epic.get("tasks", []):
            if isinstance(task, dict):
                task_title = task.get("title", "")
            else:
                task_title = str(task)

            if not task_title:
                continue

            clean_task = f"[{epic_name}] {task_title}"

            existing_task = database["tasks"].find_one({
                "project_id": project_id,
                "title": clean_task
            })

            if existing_task:
                update_fields = {"epic_order": epic_index}
                if existing_task.get("source") != "manual":
                    update_fields["source"] = "ai"
                database["tasks"].update_one(
                    {"id": existing_task["id"]},
                    {"$set": update_fields}
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
                    "due_date": None,
                    "source": "ai"
                }

                database["tasks"].insert_one(new_task)

            saved_tasks.append(clean_task)

    return {
        "message": "AI tasks generated successfully",
        "saved_tasks": saved_tasks
    }



# --------- GENERATE TASKS FOR ONE EPIC ---------


class EpicRegenerationRequest(BaseModel):
    project_id: int
    epic_name: str
    requirements: str


@router.post("/generate-epic-tasks")
def generate_epic_tasks(
    request: EpicRegenerationRequest,
    user=Depends(get_current_user)
):
    db_user = database["users"].find_one({
        "id": user["user_id"]
    })

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not check_ai_limit(db_user):
        raise HTTPException(status_code=429, detail="AI limit exceeded")

    project = database["projects"].find_one({
        "id": request.project_id
    })

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    leader = database["project_members"].find_one({
        "project_id": request.project_id,
        "user_id": user["user_id"],
        "role": "leader"
    })

    if not leader:
        raise HTTPException(
            status_code=403,
            detail="Only the project leader can generate Epic tasks"
        )

    epic_name_clean = request.epic_name.strip()
    requirements_clean = request.requirements.strip()

    if not epic_name_clean or not requirements_clean:
        raise HTTPException(
            status_code=400,
            detail="Epic name and requirements are required"
        )

    project_title = project.get("title", "")
    project_desc = project.get("description", "")
    project_context = f"{project_title} - {project_desc}" if project_desc else project_title

    generated = generate_epic_tasks_with_retry(
        project_context,
        epic_name_clean,
        requirements_clean
    )

    if not generated:
        raise HTTPException(
            status_code=503,
            detail="AI task generation failed. Existing tasks were not changed."
        )

    increment_ai_usage(db_user)

    return {
        "message": "Epic tasks generated. Review before saving.",
        "project_id": request.project_id,
        "epic_name": epic_name_clean,
        "tasks": generated["tasks"]
    }


# --------- SAVE CONFIRMED EPIC TASKS ---------

class SaveEpicTasksRequest(BaseModel):
    project_id: int
    epic_name: str
    tasks: List[str]
    replace_existing: bool


@router.post("/save-epic-tasks")
def save_epic_tasks(
    request: SaveEpicTasksRequest,
    user=Depends(get_current_user)
):
    # 1. Validate the user
    db_user = database["users"].find_one({
        "id": user["user_id"]
    })

    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2. Validate the project
    project = database["projects"].find_one({
        "id": request.project_id
    })

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 3. Only the project leader can save tasks
    leader = database["project_members"].find_one({
        "project_id": request.project_id,
        "user_id": user["user_id"],
        "role": "leader"
    })

    if not leader:
        raise HTTPException(
            status_code=403,
            detail="Only the project leader can save Epic tasks"
        )

    epic_name = request.epic_name.strip()

    if not epic_name or not request.tasks:
        raise HTTPException(
            status_code=400,
            detail="Epic name and tasks are required"
        )

    # 4. Prepare clean task titles and remove duplicates
    clean_titles = []
    seen_titles = set()

    for task in request.tasks:
        if not isinstance(task, str) or not task.strip():
            continue

        raw_task = task.strip()
        # Remove any existing [Epic Name] or bracketed prefix before re-normalizing
        cleaned_body = re.sub(r"^\[.*?\]\s*", "", raw_task).strip()
        if not cleaned_body:
            continue

        title = f"[{epic_name}] {cleaned_body}"

        if title not in seen_titles:
            clean_titles.append(title)
            seen_titles.add(title)

    if not clean_titles:
        raise HTTPException(
            status_code=400,
            detail="No valid tasks to save"
        )

    # 5. Find only existing AI tasks belonging to this Epic
    epic_prefix_pattern = r"^\[" + re.escape(epic_name) + r"\]\s*"

    old_ai_tasks = list(database["tasks"].find({
        "project_id": request.project_id,
        "source": "ai",
        "title": {"$regex": epic_prefix_pattern}
    }))

    # 6. For Keep mode, exclude tasks that already exist in the project
    if not request.replace_existing:
        existing_tasks = list(database["tasks"].find({
            "project_id": request.project_id,
            "title": {"$in": clean_titles}
        }))
        existing_titles = {t.get("title") for t in existing_tasks}

        clean_titles = [
            title for title in clean_titles
            if title not in existing_titles
        ]

        if not clean_titles:
            return {
                "message": "All generated tasks already exist in this project.",
                "saved_count": 0,
                "replaced": False
            }

    # 7. Determine epic_order for the tasks
    existing_epic_sample = database["tasks"].find_one({
        "project_id": request.project_id,
        "title": {"$regex": epic_prefix_pattern}
    })

    if existing_epic_sample and existing_epic_sample.get("epic_order") is not None:
        target_epic_order = existing_epic_sample["epic_order"]
    else:
        max_order_task = database["tasks"].find_one(
            {"project_id": request.project_id},
            sort=[("epic_order", -1)]
        )
        target_epic_order = (
            (max_order_task.get("epic_order", 0) + 1)
            if max_order_task and max_order_task.get("epic_order") is not None
            else 1
        )

    # 8. Prepare new tasks
    new_tasks = []

    for title in clean_titles:
        new_tasks.append({
            "id": get_next_id("tasks"),
            "title": title,
            "project_id": request.project_id,
            "status": "pending",
            "epic_order": target_epic_order,
            "assigned_to": None,
            "due_date": None,
            "source": "ai"
        })

    # 9. Insert new tasks first, so existing tasks remain if insertion fails
    try:
        if new_tasks:
            database["tasks"].insert_many(new_tasks)

    except Exception as e:
        print("Error inserting epic tasks:", e)
        raise HTTPException(
            status_code=500,
            detail="Could not save new tasks. Existing tasks were preserved."
        )

    # 10. Replace mode: delete only the previously identified AI tasks
    if request.replace_existing and old_ai_tasks:
        old_ids = [task["id"] for task in old_ai_tasks]

        database["tasks"].delete_many({
            "project_id": request.project_id,
            "source": "ai",
            "id": {"$in": old_ids}
        })

    # 11. Sync project.ai_tasks cache if it exists
    try:
        if project.get("ai_tasks"):
            cached_data = json.loads(project["ai_tasks"])
            if isinstance(cached_data, dict) and "epics" in cached_data:
                epic_found = False
                for ep in cached_data["epics"]:
                    if ep.get("name", "").strip().lower() == epic_name.lower():
                        epic_found = True
                        if request.replace_existing:
                            ep["tasks"] = [re.sub(r"^\[.*?\]\s*", "", t) for t in clean_titles]
                        else:
                            existing_set = set(ep.get("tasks", []))
                            for t in clean_titles:
                                t_clean = re.sub(r"^\[.*?\]\s*", "", t)
                                if t_clean not in existing_set:
                                    ep["tasks"].append(t_clean)
                                    existing_set.add(t_clean)
                        break
                if not epic_found:
                    cached_data["epics"].append({
                        "name": epic_name,
                        "tasks": [re.sub(r"^\[.*?\]\s*", "", t) for t in clean_titles]
                    })
                database["projects"].update_one(
                    {"id": request.project_id},
                    {"$set": {"ai_tasks": json.dumps(cached_data, indent=2)}}
                )
    except Exception as e:
        print("Warning: could not update project ai_tasks cache:", e)

    # 12. Log activity
    user_name = db_user.get("name", "User")
    action_desc = "replaced" if request.replace_existing else "added"
    activity_id = get_next_id("activities")
    database["activities"].insert_one({
        "id": activity_id,
        "project_id": request.project_id,
        "user_id": user["user_id"],
        "activity_type": "task_updated",
        "message": f"{user_name} {action_desc} tasks for Epic '{epic_name}' ({len(new_tasks)} tasks)"
    })

    return {
        "message": (
            "Epic tasks replaced successfully."
            if request.replace_existing
            else "New tasks added; existing tasks kept."
        ),
        "saved_count": len(new_tasks),
        "replaced": request.replace_existing
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
