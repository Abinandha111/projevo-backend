
from fastapi import APIRouter, Depends, HTTPException

from app.database.mongodb import database, serialize_docs, serialize_doc
from app.utils.dependencies import get_current_user

router = APIRouter(
    prefix="/notifications",
    tags=["Notifications"]
)


@router.get("/")
def get_my_notifications(current_user=Depends(get_current_user)):
    notifications = list(
        database["notifications"]
        .find({"user_id": current_user["user_id"]})
        .sort([("id", -1)])
    )

    unread_count = database["notifications"].count_documents({
        "user_id": current_user["user_id"],
        "is_read": False
    })

    return {
        "notifications": serialize_docs(notifications),
        "unread_count": unread_count
    }


@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user=Depends(get_current_user)
):
    notification = database["notifications"].find_one({
        "id": notification_id,
        "user_id": current_user["user_id"]
    })

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    database["notifications"].update_one(
        {
            "id": notification_id,
            "user_id": current_user["user_id"]
        },
        {"$set": {"is_read": True}}
    )

    updated_notification = database["notifications"].find_one({
        "id": notification_id,
        "user_id": current_user["user_id"]
    })

    return {
        "message": "Notification marked as read",
        "notification": serialize_doc(updated_notification)
    }
