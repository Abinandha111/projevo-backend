from sqlalchemy import Column, Integer, String, ForeignKey,Text
from app.database.connection import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)

    user_id = Column(Integer, ForeignKey("users.id"))

    ai_tasks = Column(Text, nullable=True)

    