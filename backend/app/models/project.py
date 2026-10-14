class Project:
    def __init__(
        self,
        id=None,
        title=None,
        description=None,
        user_id=None,
        ai_tasks=None,
        invite_code=None,
        deadline=None
    ):
        self.id = id
        self.title = title
        self.description = description
        self.user_id = user_id
        self.ai_tasks = ai_tasks
        self.invite_code = invite_code
        self.deadline = deadline

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "user_id": self.user_id,
            "ai_tasks": self.ai_tasks,
            "invite_code": self.invite_code,
            "deadline": self.deadline
        }