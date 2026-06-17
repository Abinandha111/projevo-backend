from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal
from app.models.project import Project
from app.schemas.project import ProjectCreate , ProjectUpdate
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_project( project: ProjectCreate,db: Session = Depends(get_db),current_user = Depends(get_current_user)):
    new_project = Project(
        title=project.title,
        description=project.description,
        user_id = current_user["user_id"]
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    return {"message": "Project created", "project": new_project}


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

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
