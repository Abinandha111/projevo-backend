
from datetime import datetime, timedelta
from app.database.mongodb import database, ReturnDocument

AI_LIMIT = 20
AI_COOLDOWN_HOURS = 8


def _parse_datetime(val):
    if isinstance(val, datetime):
        return val

    if isinstance(val, str):
        try:
            return datetime.fromisoformat(val)
        except ValueError:
            return None

    return None


def reset_if_needed(user):
    user_id = user.get("id")

    if user_id is None:
        return user

    now = datetime.utcnow()
    cooldown_until = _parse_datetime(
        user.get("ai_cooldown_until")
    )

    if cooldown_until and now >= cooldown_until:
        updates = {
            "ai_usage_count": 0,
            "ai_cooldown_until": None,
            "last_reset": now,
        }

        database["users"].update_one(
            {"id": user_id, "ai_cooldown_until": {"$ne": None}},
            {"$set": updates},
        )
        user.update(updates)

    return user


def reserve_ai_usage(user_id: int) -> bool:
    """
    Atomically reserve one AI use.
    Returns False if the limit or cooldown blocks the request.
    """
    now = datetime.utcnow()
    cooldown_end = now + timedelta(hours=AI_COOLDOWN_HOURS)

    # Reset the count only when a stored cooldown has expired.
    database["users"].update_one(
        {
            "id": user_id,
            "ai_cooldown_until": {"$ne": None, "$lte": now},
        },
        {
            "$set": {
                "ai_usage_count": 0,
                "ai_cooldown_until": None,
                "last_reset": now,
            }
        },
    )

    # Atomically allow one use only if fewer than 20 uses remain
    # and no active cooldown exists.
    updated_user = database["users"].find_one_and_update(
        {
            "id": user_id,
            "ai_usage_count": {"$lt": AI_LIMIT},
            "$or": [
                {"ai_cooldown_until": None},
                {"ai_cooldown_until": {"$exists": False}},
            ],
        },
        {
            "$inc": {"ai_usage_count": 1},
        },
        return_document=ReturnDocument.AFTER,
    )

    if updated_user is None:
        return False

    # Start the cooldown when the 20th use is reserved.
    if updated_user.get("ai_usage_count", 0) >= AI_LIMIT:
        database["users"].update_one(
            {
                "id": user_id,
                "ai_usage_count": {"$gte": AI_LIMIT},
                "$or": [
                    {"ai_cooldown_until": None},
                    {"ai_cooldown_until": {"$exists": False}},
                ],
            },
            {"$set": {"ai_cooldown_until": cooldown_end}},
        )

    return True
