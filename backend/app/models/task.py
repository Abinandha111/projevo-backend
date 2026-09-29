from sqlalchemy import Column, Integer, String, ForeignKey
from app.database.connection import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    epic_order = Column(Integer, default=0)

    status = Column(String, default="pending")

    project_id = Column(
        Integer,
        ForeignKey("projects.id")
    )

    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)