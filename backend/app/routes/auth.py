from fastapi import APIRouter, Depends , HTTPException
from app.utils.security import hash_password , verify_password

from app.database.mongodb import database,get_next_id

from datetime import datetime

from app.schemas.user import UserCreate , UserLogin
from app.utils.jwt_handler import create_access_token
from app.utils.dependencies import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserCreate ):

    # check email already exists
    existing_user = database["users"].find_one({
        "email": user.email
    })
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    

    # create new user
    new_user = {
        "id": get_next_id("users"),
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),
        "role": "user",
        "ai_usage_count": 0,
        "last_reset": datetime.utcnow(),
        "plan": "free"
    }

    database["users"].insert_one(new_user)

    return {"message": "User registered successfully 🚀"}

@router.post("/login")
def login(user: UserLogin):
     # find user by email
    db_user = database["users"].find_one({
        "email": user.email
    })

    # check user exists
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # check password
    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    token = create_access_token({
        "user_id": db_user["id"],
        "email": db_user["email"]
    })

    return {
        "message": "Login successful 🚀",
        "token": token,
        "user": {
            "id": db_user["id"],
            "name": db_user["name"],
            "email": db_user["email"]
        }
    }

@router.get("/profile")
def profile(user=Depends(get_current_user)):

    db_user = database["users"].find_one({
        "id": user["user_id"]
    })
     
    if db_user:

        return {
            "message": "Protected route accessed 🔐",
            "user": {
                "id": db_user["id"],
                "user_id": db_user["id"],
                "name": db_user["name"],
                "email": db_user["email"],
                "role": db_user.get("role", "user")
            }
        }
    return {
        "message": "Protected route accessed 🔐",
        "user": user
    }
    