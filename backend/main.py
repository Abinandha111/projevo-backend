from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, project, task, dashboard, ai
from app.database.connection import Base, engine

import app.models.user
import app.models.project
import app.models.task

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

# DB create tables
Base.metadata.create_all(bind=engine)

# routes
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(project.router)
app.include_router(task.router)
app.include_router(ai.router)

# home route
@app.get("/")
def home():
    return {"message": "Projevo API is running 🚀"}