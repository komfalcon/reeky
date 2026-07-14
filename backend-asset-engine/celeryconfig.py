# celeryconfig.py
# pyrefly: ignore [missing-import]
from celery.schedules import crontab
import os

# Dynamic connection loader: looks for environment variable, falls back to local container network setup
broker_url = os.getenv('CELERY_BROKER_URL', 'redis://local-redis:6379/0')
result_backend = os.getenv('CELERY_RESULT_BACKEND', 'redis://local-redis:6379/0')

beat_schedule = {
    'refresh-notebooklm-auth': {
        'task': 'tasks.refresh_auth_token_task',
        'schedule': crontab(minute='*/15'), # Every 15 minutes
    },
}

timezone = 'UTC'
database_short_lived_sessions = True