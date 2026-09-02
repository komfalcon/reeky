# paths.py — portable data directories for Docker and local runs
import os

_BASE = os.path.dirname(os.path.abspath(__file__))

# Prefer /app/data in containers; fall back to local ./data
if os.path.isdir("/app") and os.access("/app", os.W_OK):
    DATA_DIR = os.getenv("DATA_DIR", "/app/data")
else:
    DATA_DIR = os.getenv("DATA_DIR", os.path.join(_BASE, "data"))

STATIC_DIR = os.path.join(DATA_DIR, "assets")
QUEUE_FILE = os.path.join(DATA_DIR, "queue.json")


def ensure_data_dirs():
    os.makedirs(STATIC_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)
