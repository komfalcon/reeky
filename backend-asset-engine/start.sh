#!/bin/bash
set -e

# Celery worker (concurrency=1 — Playwright is heavy)
celery -A tasks worker --loglevel=info --concurrency=1 &

# FastAPI
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
