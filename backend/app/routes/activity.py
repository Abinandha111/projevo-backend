from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.models.activity import Activity
from app.models.Project_Member import Project_Member
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/activities",
    tags=["Activities"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/recent")
def get_recent_activities(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    activities = db.query(Activity).join(
        Project_Member, 
        Activity.project_id == Project_Member.project_id
    ).filter(
        Project_Member.user_id == current_user.id
    ).order_by(
        Activity.id.desc()
    ).limit(10).all()

    return {
        "activities": activities
    }