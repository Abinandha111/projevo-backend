from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.connection import Base


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)

    project_id = Column(
        Integer,
        ForeignKey("projects.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    activity_type = Column(
        String,
        nullable=False
    )

    message = Column(
        String,
        nullable=False
    )