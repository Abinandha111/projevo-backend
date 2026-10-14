from datetime import datetime, timedelta
from app.database.mongodb import database

AI_LIMIT = 20  # per day per user


def _parse_datetime(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, str):
        for fmt in (
            "%Y-%m-%d %H:%M:%S.%f",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S.%f",
            "%Y-%m-%dT%H:%M:%S",
        ):
            try:
                return datetime.strptime(val, fmt)
            except ValueError:
                continue
    return None


def reset_if_needed(user):
    now = datetime.utcnow()
    user_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)
    raw_last_reset = user.get("last_reset") if isinstance(user, dict) else getattr(user, "last_reset", None)
    last_reset_dt = _parse_datetime(raw_last_reset)

    needs_reset = False
    if not last_reset_dt or last_reset_dt < (now - timedelta(days=1)):
        needs_reset = True

    if needs_reset:
        if isinstance(user, dict):
            user["ai_usage_count"] = 0
            user["last_reset"] = now
        else:
            user.ai_usage_count = 0
            user.last_reset = now

        if user_id:
            database["users"].update_one(
                {"id": user_id},
                {"$set": {"ai_usage_count": 0, "last_reset": now}}
            )

    return user


def check_ai_limit(user):
    user = reset_if_needed(user)
    count = user.get("ai_usage_count", 0) if isinstance(user, dict) else getattr(user, "ai_usage_count", 0)
    return count < AI_LIMIT


def increment_ai_usage(user):
    now = datetime.utcnow()
    user_id = user.get("id") if isinstance(user, dict) else getattr(user, "id", None)

    if isinstance(user, dict):
        new_count = user.get("ai_usage_count", 0) + 1
        user["ai_usage_count"] = new_count
        user["last_reset"] = now
    else:
        new_count = getattr(user, "ai_usage_count", 0) + 1
        user.ai_usage_count = new_count
        user.last_reset = now

    if user_id:
        database["users"].update_one(
            {"id": user_id},
            {"$set": {"ai_usage_count": new_count, "last_reset": now}}
        )