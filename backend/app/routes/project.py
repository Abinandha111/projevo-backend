from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.utils.dependencies import get_current_user
from app.models.Project_Member import ProjectMember
from app.models.task import Task
from app.services.gemini_service import validate_project_idea
router = APIRouter(prefix="/projects", tags=["Projects"])

import secrets

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_project( project: ProjectCreate,db: Session = Depends(get_db),current_user = Depends(get_current_user)):
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
    new_project = Project(
        title=project.title,
        description=project.description,
        user_id = current_user["user_id"],
        invite_code = invite_code,
        deadline = project.deadline
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    new_member = ProjectMember(
        project_id=new_project.id,
        user_id=current_user["user_id"],
        role="leader"
    )

    db.add(new_member)
    db.commit()

    return {
    "message": "Project created",
    "project": {
        "id": new_project.id,
        "title": new_project.title,
        "description": new_project.description,
        "user_id": new_project.user_id,
        "invite_code": new_project.invite_code,
        "deadline": new_project.deadline
        
    }
}


@router.get("/")
def get_projects(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    memberships = db.query(ProjectMember).filter(
        ProjectMember.user_id == current_user["user_id"]
    ).all()

    project_ids = [m.project_id for m in memberships]
    if not project_ids:
        return []

    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
    role_map = {m.project_id: m.role for m in memberships}

    result = []
    for project in projects:
        member_count = db.query(ProjectMember).filter(ProjectMember.project_id == project.id).count()
        tasks = db.query(Task).filter(Task.project_id == project.id).all()
        completed_tasks = len([t for t in tasks if t.status == "completed"])
        total_tasks = len(tasks)
        progress = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0

        result.append({
            "id": project.id,
            "title": project.title,
            "description": project.description,
            "user_id": project.user_id,
            "invite_code": project.invite_code,
            "deadline": project.deadline,
            "role": role_map.get(project.id, "member"),
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
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user["user_id"]
    ).first()

    if not db_project:
        return {"error": "Project not found"}

    db_project.title = project.title
    db_project.description = project.description

    db.commit()
    db.refresh(db_project)

    return {
        "message": "Project updated successfully",
        "project": db_project
    }


@router.delete("/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Only project leader can delete the project
    leader = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user["user_id"],
        ProjectMember.role == "leader"
    ).first()

    if not leader:
        raise HTTPException(
            status_code=403,
            detail="Only the project leader can delete this project"
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=404,
            detail="Project not found"
        )

    db.query(Task).filter(Task.project_id == project_id).delete()
    db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
