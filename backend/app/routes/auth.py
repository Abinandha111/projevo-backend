from fastapi import APIRouter, Depends , HTTPException
from app.utils.security import hash_password , verify_password
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User
from app.schemas.user import UserCreate , UserLogin
from app.utils.jwt_handler import create_access_token
from app.utils.dependencies import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):

    # check email already exists
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    

    # create new user
    new_user = User(
        name=user.name,
        email=user.email,
        password=hash_password(user.password),
        role="user"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully 🚀"}

@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
     # find user by email
    db_user = db.query(User).filter(User.email == user.email).first()

    # check user exists
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # check password
    if not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")
    
    token = create_access_token({
    "user_id": db_user.id,
    "email": db_user.email
    })

    return {
        "message": "Login successful 🚀",
        "token": token,
        "user": {
            "id": db_user.id,
            "name": db_user.name,
            "email": db_user.email
        }
    }

@router.get("/profile")
def profile(user=Depends(get_current_user)):
    return {
        "message": "Protected route accessed 🔐",
        "user": user
    }
    