#!/bin/bash
# Start Celery worker in the background
# concurrency=1 to satisfy notebooklm-py concurrency contract
celery -A tasks worker --loglevel=info --concurrency=1 &

# Start Celery Beat in the background for cron jobs
celery -A tasks beat --loglevel=info &

# Start FastAPI application
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
