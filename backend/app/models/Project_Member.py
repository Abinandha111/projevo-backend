class ProjectMember:
    def __init__(
        self,
        id=None,
        project_id=None,
        user_id=None,
        role="member"
    ):
        self.id = id
        self.project_id = project_id
        self.user_id = user_id
        self.role = role

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "user_id": self.user_id,
            "role": self.role
        }