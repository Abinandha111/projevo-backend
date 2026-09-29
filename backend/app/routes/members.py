from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.Project_Member import ProjectMember
from app.models.user import User
from app.models.project import Project
from app.utils.dependencies import get_current_user

from pydantic import BaseModel


router = APIRouter(
    prefix="/members",
    tags=["Members"]
)

class JoinProject(BaseModel):
    invite_code: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_project_leader(
    project_id: int,
    current_user,
    db: Session
):
    leader = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == current_user["user_id"],
        ProjectMember.role == "leader"
    ).first()

    return leader

@router.get("/{project_id}")
def get_project_members(
    project_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    members = db.query(
        ProjectMember,
        User
    ).join(
        User,
        ProjectMember.user_id == User.id
    ).filter(
        ProjectMember.project_id == project_id
    ).all()

    return [
        {
            "id": member.id,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": member.role
        }
        for member, user in members
    ]

@router.post("/join")
def join_project(
    data: JoinProject,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    project = db.query(Project).filter(
        Project.invite_code == data.invite_code
    ).first()

    if not project:
        return {
            "message": "Invalid invite code"
        }

    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id,
        ProjectMember.user_id == current_user["user_id"]
    ).first()

    if existing_member:
        return {
            "message": "Already a member"
        }

    new_member = ProjectMember(
        project_id=project.id,
        user_id=current_user["user_id"],
        role="member"
    )

    db.add(new_member)
    db.commit()

    return {
        "message": "Joined project successfully"
    }