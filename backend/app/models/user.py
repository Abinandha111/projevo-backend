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
        plan="free"
    ):
        self.id = id
        self.name = name
        self.email = email
        self.password = password
        self.role = role
        self.ai_usage_count = ai_usage_count
        self.last_reset = last_reset or datetime.utcnow()
        self.plan = plan