
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler

from app.database.mongodb import database
from app.services.notification_service import create_notification


IST = ZoneInfo("Asia/Kolkata")


def parse_due_date(value):
    if not value:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None

    return None


def check_deadline_notifications():
    today = datetime.now(IST).date()
    reminder_date = today + timedelta(days=2)

    tasks = database["tasks"].find({
        "status": {"$ne": "completed"},
        "due_date": {"$ne": None}
    })

    for task in tasks:
        due_date = parse_due_date(task.get("due_date"))

        if due_date is None:
            continue

        project = database["projects"].find_one({
            "id": task["project_id"]
        })

        if not project:
            continue

        leader_id = project.get("user_id")
        assigned_id = task.get("assigned_to")

        recipients = []

        if leader_id is not None:
            recipients.append(leader_id)

        if assigned_id is not None and assigned_id not in recipients:
            recipients.append(assigned_id)

        
        # Reminders during the 2 days before the deadline
        if today < due_date and today >= due_date - timedelta(days=2):
            sent_date = task.get("deadline_reminder_sent_for")

            if sent_date != str(today):
                for user_id in recipients:
                    create_notification(
                        user_id=user_id,
                        message=(
                            f'Task "{task.get("title", "")}" '
                            f'is due on {due_date}.'
                        ),
                        notification_type="deadline_reminder",
                        project_id=task["project_id"],
                        task_id=task["id"]
                    )

                database["tasks"].update_one(
                    {"id": task["id"]},
                    {"$set": {
                        "deadline_reminder_sent_for": str(today)
                    }}
                )

        # Daily reminder after the deadline has passed
        elif due_date < today:
            sent_date = task.get("overdue_reminder_sent_for")

            if sent_date != str(today):
                for user_id in recipients:
                    create_notification(
                        user_id=user_id,
                        message=(
                            f'Task "{task.get("title", "")}" '
                            f'is overdue. Deadline was {due_date}.'
                        ),
                        notification_type="task_overdue",
                        project_id=task["project_id"],
                        task_id=task["id"]
                    )

                database["tasks"].update_one(
                    {"id": task["id"]},
                    {"$set": {
                        "overdue_reminder_sent_for": str(today)
                    }}
                )


scheduler = BackgroundScheduler(timezone=IST)


def start_deadline_scheduler():
    if scheduler.running:
        return

    scheduler.add_job(
        check_deadline_notifications,
        trigger="cron",
        hour=9,
        minute=0,
        id="deadline_notifications",
        replace_existing=True,
        max_instances=1
    )

    scheduler.start()
