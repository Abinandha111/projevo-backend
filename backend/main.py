from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, project, task, dashboard, ai, members, activity, notification
from app.database.mongodb import check_mongodb_connection

from app.services.deadline_schedular import (start_deadline_scheduler,scheduler)

import app.models.user
import app.models.project
import app.models.task
import app.models.Project_Member
import app.models.activity

# ✅ FIRST create app
app = FastAPI()

# ✅ THEN CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://projevo-frontend.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Optional MongoDB connection check on startup
@app.on_event("startup")
def startup_db_check():
    try:
        check_mongodb_connection()
        print("Connected to MongoDB Atlas successfully")
    except Exception as e:
        print("MongoDB Atlas connection warning:", e)

    try:
        start_deadline_scheduler()
        print("Deadline scheduler started successfully")
    except Exception as e:
        print("Deadline scheduler startup error:", e)


@app.on_event("shutdown")
def shutdown_deadline_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("Deadline scheduler stopped successfully")

# routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(project.router)
app.include_router(task.router)
app.include_router(ai.router)
app.include_router(members.router)
app.include_router(activity.router)
app.include_router(notification.router)

# home route
@app.get("/")
def home():
    return {"message": "Projevo API is running 🚀"}