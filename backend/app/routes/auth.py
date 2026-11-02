from fastapi import APIRouter, Depends , HTTPException
from app.utils.security import hash_password , verify_password

from app.database.mongodb import database,get_next_id

from datetime import datetime,timedelta

import requests
import os
import secrets
import hashlib


from app.schemas.user import UserCreate , UserLogin
from app.utils.jwt_handler import create_access_token
from app.utils.dependencies import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])

def send_otp_email(email: str, otp: str):

    url = "https://api.brevo.com/v3/smtp/email"

    headers = {
        "accept": "application/json",
        "api-key": os.getenv("BREVO_API_KEY"),
        "content-type": "application/json"
    }

    payload = {
        "sender": {
            "name": os.getenv("BREVO_SENDER_NAME", "NexTask"),
            "email": os.getenv("BREVO_SENDER_EMAIL")
        },
        "to": [
            {
                "email": email
            }
        ],
        "subject": "NexTask - Password Reset OTP",
        "htmlContent": f"""
            <h2>Password Reset</h2>
            <p>Your NexTask password reset OTP is:</p>
            <h1>{otp}</h1>
            <p>This OTP is valid for 5 minutes.</p>
        """
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload
    )

    if response.status_code not in (200, 201, 202):
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP email"
        )

@router.post("/forgot-password")
def forgot_password(email: str):

    db_user = database["users"].find_one({
        "email": email
    })

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="Email not registered"
        )

    # Generate 6-digit OTP
    otp = str(secrets.randbelow(900000) + 100000)

    # Hash OTP before storing
    hashed_otp = hashlib.sha256(otp.encode()).hexdigest()

    # Save OTP with 5-minute expiry
    database["password_reset_otps"].update_one(
        {"email": email},
        {
            "$set": {
                "otp": hashed_otp,
                "expires_at": datetime.utcnow() + timedelta(minutes=5),
                "attempts": 0
            }
        },
        upsert=True
    )

    # Send OTP email
    send_otp_email(email, otp)

    return {
        "message": "OTP sent successfully to your email"
    }

@router.post("/verify-reset-otp")
def verify_reset_otp(email: str, otp: str):

    otp_record = database["password_reset_otps"].find_one({
        "email": email
    })

    if not otp_record:
        raise HTTPException(
            status_code=400,
            detail="OTP not found. Please request a new OTP."
        )

    # Check OTP expiry
    if datetime.utcnow() > otp_record["expires_at"]:
        database["password_reset_otps"].delete_one({
            "email": email
        })

        raise HTTPException(
            status_code=400,
            detail="OTP expired. Please request a new OTP."
        )

    # Limit wrong OTP attempts
    if otp_record.get("attempts", 0) >= 5:
        database["password_reset_otps"].delete_one({
            "email": email
        })

        raise HTTPException(
            status_code=400,
            detail="Too many attempts. Please request a new OTP."
        )

    # Verify OTP
    hashed_otp = hashlib.sha256(otp.encode()).hexdigest()

    if not secrets.compare_digest(hashed_otp, otp_record["otp"]):

        database["password_reset_otps"].update_one(
            {"email": email},
            {"$inc": {"attempts": 1}}
        )

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP"
        )

    # Generate password reset token
    reset_token = secrets.token_urlsafe(32)

    hashed_token = hashlib.sha256(
        reset_token.encode()
    ).hexdigest()

    database["password_reset_otps"].update_one(
        {"email": email},
        {
            "$set": {
                "reset_token": hashed_token,
                "reset_token_expires_at": datetime.utcnow() + timedelta(minutes=10)
            },
            "$unset": {
                "otp": "",
                "expires_at": ""
            }
        }
    )

    return {
        "message": "OTP verified successfully",
        "reset_token": reset_token
    }


@router.post("/reset-password")
def reset_password(
    email: str,
    reset_token: str,
    new_password: str
):
    # Find the OTP record
    otp_record = database["password_reset_otps"].find_one({
        "email": email
    })

    if not otp_record or not otp_record.get("reset_token"):
        raise HTTPException(
            status_code=400,
            detail="Invalid reset request. Please verify OTP again."
        )

    # Check reset token expiry
    if datetime.utcnow() > otp_record["reset_token_expires_at"]:
        database["password_reset_otps"].delete_one({
            "email": email
        })

        raise HTTPException(
            status_code=400,
            detail="Reset token expired. Please verify OTP again."
        )

    # Verify reset token
    hashed_token = hashlib.sha256(
        reset_token.encode()
    ).hexdigest()

    if not secrets.compare_digest(
        hashed_token,
        otp_record["reset_token"]
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid reset token"
        )

    # Find the user
    db_user = database["users"].find_one({
        "email": email
    })

    if not db_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Update password
    database["users"].update_one(
        {"email": email},
        {
            "$set": {
                "password": hash_password(new_password)
            }
        }
    )

    # Delete reset record so the token cannot be reused
    database["password_reset_otps"].delete_one({
        "email": email
    })

    return {
        "message": "Password reset successfully"
    }

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

    if not db_user or not verify_password(
    user.password,
    db_user["password"] if db_user else ""
    ):
        raise HTTPException(
        status_code=401,
        detail="Invalid email or password"
    )

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

    raise HTTPException(
        status_code=401,
        detail="User account not found"
    )