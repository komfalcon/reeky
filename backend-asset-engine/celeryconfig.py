# celeryconfig.py
import os

broker_url = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
result_backend = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")

# Include task modules
imports = ("tasks",)

task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]
timezone = "UTC"
enable_utc = True

# Soft time limits for long Playwright scrapes
task_soft_time_limit = 600
task_time_limit = 720

beat_schedule = {}
database_short_lived_sessions = True
