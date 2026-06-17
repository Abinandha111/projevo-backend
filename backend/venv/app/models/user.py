from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from app.database.connection import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)

    role = Column(String, default="user") 
    ai_usage_count = Column(Integer, default=0)
    last_reset = Column(DateTime, default=datetime.utcnow)

    plan = Column(String, default="free")