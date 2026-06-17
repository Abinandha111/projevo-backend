from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal

from app.models.project import Project
from app.models.task import Task
from app.models.user import User

from app.services.gemini_service import generate_task_breakdown_with_retry
from app.utils.ai_limit import check_ai_limit, increment_ai_usage
from app.utils.dependencies import get_current_user

import json

router = APIRouter(prefix="/ai", tags=["AI"])


# ---------------- DB ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def safe_parse_ai(ai_text: str):
    try:
        return json.loads(ai_text)
    except:
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
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):

    db_user = db.query(User).filter(User.id == user["user_id"]).first()

    if not db_user:
        return {"error": "User not found"}

    # AI LIMIT CHECK
    if not check_ai_limit(db_user):
        raise HTTPException(status_code=429, detail="AI limit exceeded")

    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        return {"error": "Project not found"}

    # CACHE CHECK
    if project.ai_tasks:
        try:
            json.loads(project.ai_tasks)
            return {
                "message": "From cache",
                "saved_tasks": project.ai_tasks.split("\n")
            }
        except:
            pass

    # GEMINI CALL
    ai_tasks = generate_task_breakdown_with_retry(project.title)

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
    project.ai_tasks = ai_tasks
    db.add(project)

    # INCREMENT USAGE
    increment_ai_usage(db_user)

    # SAVE TASKS
    saved_tasks = []

    for epic in structured_ai.get("epics", []):

        epic_name = epic.get("name", "General")

        for task in epic.get("tasks", []):

            clean_task = f"[{epic_name}] {task}"

            existing_task = db.query(Task).filter(
                Task.project_id == project.id,
                Task.title == clean_task
            ).first()

            if not existing_task:
                new_task = Task(
                    title=clean_task,
                    project_id=project.id,
                    status="pending"
                )

                db.add(new_task)
                saved_tasks.append(clean_task)

    db.commit()

    return {
        "message": "AI generated + cached successfully",
        "saved_tasks": saved_tasks
    }