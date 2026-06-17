from datetime import datetime, timedelta

AI_LIMIT = 20  # per day per user


def reset_if_needed(user):
    if not user.last_reset:
        user.ai_usage_count = 0
        user.last_reset = datetime.utcnow()
        return user

    if user.last_reset < datetime.utcnow() - timedelta(days=1):
        user.ai_usage_count = 0
        user.last_reset = datetime.utcnow()

    return user


def check_ai_limit(user):
    user = reset_if_needed(user)
    return user.ai_usage_count < AI_LIMIT


def increment_ai_usage(user):
    user.ai_usage_count += 1
    user.last_reset = datetime.utcnow()