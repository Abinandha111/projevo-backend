from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.project import Project
from app.schemas.project import ProjectCreate , ProjectUpdate
from app.utils.dependencies import get_current_user
from app.models.Project_Member import ProjectMember
from app.models.task import Task
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
    invite_code = secrets.token_hex(4)
    new_project = Project(
        title=project.title,
        description=project.description,
        user_id = current_user["user_id"],
        invite_code = invite_code
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
        "invite_code": new_project.invite_code
    }
}


@router.get("/")
def get_projects(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    projects = db.query(Project).filter(
        Project.user_id == current_user["user_id"]
    ).all()

    return projects

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
    project = db.query(Project).filter(
        Project.id == project_id,
        Project.user_id == current_user["user_id"]
    ).first()

    if not project:
        return {"error": "Project not found"}


    db.query(Task).filter(
    Task.project_id == project_id
).delete()

    db.query(ProjectMember).filter(
    ProjectMember.project_id == project_id
).delete()

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
