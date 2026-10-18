from datetime import datetime, timedelta
from app.database.mongodb import database

AI_LIMIT = 20  # cumulative uses per user before cooldown

AI_COOLDOWN_HOURS = 8


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

    user_id = (
        user.get("id")
        if isinstance(user, dict)
        else getattr(user, "id", None)
    )

    raw_cooldown = (
        user.get("ai_cooldown_until")
        if isinstance(user, dict)
        else getattr(user, "ai_cooldown_until", None)
    )

    cooldown_until = _parse_datetime(raw_cooldown)

    # Cooldown is still active
    if cooldown_until and now < cooldown_until:
        return user

    # Cooldown finished: restore a fresh set of 20 uses
    if cooldown_until and now >= cooldown_until:
        updates = {
            "ai_usage_count": 0,
            "ai_cooldown_until": None,
            "last_reset": now,
        }

        if isinstance(user, dict):
            user.update(updates)
        else:
            user.ai_usage_count = 0
            user.ai_cooldown_until = None
            user.last_reset = now

        if user_id is not None:
            database["users"].update_one(
                {"id": user_id},
                {"$set": updates},
            )

    return user



def check_ai_limit(user):
    user = reset_if_needed(user)

    user_id = (
        user.get("id")
        if isinstance(user, dict)
        else getattr(user, "id", None)
    )

    count = (
        user.get("ai_usage_count", 0)
        if isinstance(user, dict)
        else getattr(user, "ai_usage_count", 0)
    )

    cooldown_until = _parse_datetime(
        user.get("ai_cooldown_until")
        if isinstance(user, dict)
        else getattr(user, "ai_cooldown_until", None)
    )

    now = datetime.utcnow()

    # If fewer than 20 uses, clear any stale cooldown
    if count < AI_LIMIT:
        if cooldown_until is not None:
            if isinstance(user, dict):
                user["ai_cooldown_until"] = None
            else:
                user.ai_cooldown_until = None

            if user_id is not None:
                database["users"].update_one(
                    {"id": user_id},
                    {"$set": {"ai_cooldown_until": None}}
                )

        return True

    # If 20 uses reached and cooldown is active, block usage
    if cooldown_until and now < cooldown_until:
        return False

    # Cooldown expired; reset usage and allow generation
    if cooldown_until and now >= cooldown_until:
        reset_if_needed(user)
        return True

    # Safety fallback for count at/above limit
    return False





def increment_ai_usage(user):
    now = datetime.utcnow()

    user_id = (
        user.get("id")
        if isinstance(user, dict)
        else getattr(user, "id", None)
    )

    count = (
        user.get("ai_usage_count", 0)
        if isinstance(user, dict)
        else getattr(user, "ai_usage_count", 0)
    )

    new_count = count + 1

    updates = {
        "ai_usage_count": new_count,
        "last_reset": now,
        "ai_cooldown_until": (
            now + timedelta(hours=AI_COOLDOWN_HOURS)
            if new_count >= AI_LIMIT
            else None
        ),
    }

    if isinstance(user, dict):
        user.update(updates)
    else:
        user.ai_usage_count = updates["ai_usage_count"]
        user.last_reset = updates["last_reset"]
        user.ai_cooldown_until = updates["ai_cooldown_until"]

    if user_id is not None:
        database["users"].update_one(
            {"id": user_id},
            {"$set": updates},
        )

        
