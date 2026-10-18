from datetime import datetime


class User:
    def __init__(
        self,
        id=None,
        name=None,
        email=None,
        password=None,
        role="user",
        ai_usage_count=0,
        last_reset=None,
        ai_cooldown_until=None,
        plan="free"
        
    ):
        self.id = id
        self.name = name
        self.email = email
        self.password = password
        self.role = role
        self.ai_usage_count = ai_usage_count
        self.last_reset = last_reset or datetime.utcnow()
        self.ai_cooldown_until = ai_cooldown_until
        self.plan = plan