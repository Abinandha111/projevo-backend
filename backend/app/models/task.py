class Task:
    def __init__(
        self,
        id=None,
        title=None,
        epic_order=0,
        status="pending",
        project_id=None,
        assigned_to=None,
        due_date=None
    ):
        self.id = id
        self.title = title
        self.epic_order = epic_order
        self.status = status
        self.project_id = project_id
        self.assigned_to = assigned_to
        self.due_date = due_date

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "epic_order": self.epic_order,
            "status": self.status,
            "project_id": self.project_id,
            "assigned_to": self.assigned_to,
            "due_date": self.due_date
        }