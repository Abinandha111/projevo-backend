
from datetime import datetime, timezone

from app.database.mongodb import database, get_next_id


def create_notification(
    user_id: int,
    message: str,
    notification_type: str,
    project_id: int,
    task_id: int
):
    notification = {
        "id": get_next_id("notifications"),
        "user_id": user_id,
        "project_id": project_id,
        "task_id": task_id,
        "type": notification_type,
        "message": message,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    database["notifications"].insert_one(notification)

    return notification
