import os
import json
import logging
from pathlib import Path
from paths import DATA_DIR

logger = logging.getLogger("reeky-task-store")

TASK_STORE_FILE = Path(DATA_DIR) / "local_tasks.json"

def _read_store() -> dict:
    if not TASK_STORE_FILE.exists():
        return {}
    try:
        with open(TASK_STORE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read local task store: {e}")
        return {}

def _write_store(data: dict):
    try:
        os.makedirs(os.path.dirname(TASK_STORE_FILE), exist_ok=True)
        with open(TASK_STORE_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        logger.error(f"Failed to write local task store: {e}")

def save_task_status(task_id: str, status: str, result: dict = None, error: str = None):
    store = _read_store()
    store[task_id] = {
        "status": status,
        "result": result,
        "error": error
    }
    _write_store(store)
    logger.info(f"Saved task {task_id} status={status}")

def get_task_status_local(task_id: str) -> dict:
    store = _read_store()
    return store.get(task_id)
