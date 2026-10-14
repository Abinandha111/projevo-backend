class Activity:
    def __init__(
        self,
        id=None,
        project_id=None,
        user_id=None,
        activity_type=None,
        message=None
    ):
        self.id = id
        self.project_id = project_id
        self.user_id = user_id
        self.activity_type = activity_type
        self.message = message

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "activity_type": self.activity_type,
            "message": self.message
        }