from fastapi import FastAPI
from app.routes import auth ,project,task,dashboard,ai

from app.database.connection import Base, engine
import app.models.user
import app.models.project
import app.models.task





app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(project.router)
app.include_router(task.router)
app.include_router(ai.router)
@app.get("/")
def home():
    
    return {"message": "Projevo API is running 🚀"}

