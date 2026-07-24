# main.py - Celery-free version using background threads + webhook callback
import sys
import io
# Force UTF-8 stdout so emoji in print() don't crash on Windows cp1252 consoles
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from tasks import process_submission_sync
import os
import json
import datetime
import threading
import requests

app = FastAPI(title="NotebookLM Backend Asset Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory task status tracker (lives for the duration of the server process)
task_registry: dict = {}

QUEUE_FILE = "queue.json"
NODE_WEBHOOK_URL = os.environ.get("NODE_WEBHOOK_URL", "http://localhost:5000/api/assets/webhook/complete")

def read_queue():
    if not os.path.exists(QUEUE_FILE):
        return []
    try:
        with open(QUEUE_FILE, "r") as f:
            return json.load(f)
    except Exception:
        return []

def write_queue(data):
    with open(QUEUE_FILE, "w") as f:
        json.dump(data, f, indent=4)

from typing import Optional, List

class UserUploadRequest(BaseModel):
    user_id: str
    pdf_url: Optional[str] = None
    assets_requested: List[str] = ["flashcards", "quizzes", "podcast", "video", "mindmap"]
    student_preferences: Optional[str] = None
    custom_instructions: Optional[str] = None

class AdminSubmissionRequest(BaseModel):
    user_id: str
    artifact_urls: Optional[List[str]] = []
    podcast_audio: Optional[str] = None
    video_overview: Optional[str] = None
    flashcards_url: Optional[str] = None
    quizzes_url: Optional[str] = None
    mindmap_url: Optional[str] = None
    slide_deck_url: Optional[str] = None
    study_report_url: Optional[str] = None
    data_table_url: Optional[str] = None
    infographic_url: Optional[str] = None
    infographic: Optional[str] = None
    slide_deck: Optional[str] = None
    study_report: Optional[str] = None
    data_table: Optional[str] = None


@app.get("/")
@app.head("/")
def read_root():
    return {"status": "alive"}

@app.post("/generate")
def user_upload_pdf(request: UserUploadRequest):
    queue_data = read_queue()
    existing = next((item for item in queue_data if item["user_id"] == request.user_id), None)
    if existing:
        return {"status": "queued", "task_id": f"queue_{request.user_id}", "message": "Already in queue!"}

    queue_data.append({
        "user_id": request.user_id,
        "pdf_url": request.pdf_url,
        "assets_requested": request.assets_requested,
        "student_preferences": request.student_preferences,
        "custom_instructions": request.custom_instructions,
        "timestamp": datetime.datetime.utcnow().isoformat()
    })
    write_queue(queue_data)
    return {"status": "queued", "task_id": f"queue_{request.user_id}", "message": "Request queued!"}

@app.get("/admin/queue")
def admin_get_queue():
    return {"queue": read_queue()}

def _run_scraping_job(task_id: str, config: dict):
    """Background thread worker - scrapes URLs then pings the Node webhook."""
    asset_id = config.get("user_id")
    print(f"[{task_id}] Starting scraping job for assetId: {asset_id}")
    task_registry[task_id] = {"status": "PROCESSING", "asset_id": asset_id}

    try:
        results = process_submission_sync(config)
        task_registry[task_id]["status"] = "SUCCESS"
        task_registry[task_id]["result"] = results
        print(f"[{task_id}] Scraping complete. Calling webhook...")

        # Notify Node.js API to save results and mark COMPLETED
        try:
            requests.post(NODE_WEBHOOK_URL, json={
                "assetId": asset_id,
                "assets": results
            }, timeout=10)
            print(f"[{task_id}] Webhook called successfully.")
        except Exception as webhook_err:
            print(f"[{task_id}] Webhook failed (results still saved in memory): {webhook_err}")

    except Exception as e:
        print(f"[{task_id}] Scraping job failed: {e}")
        task_registry[task_id]["status"] = "FAILURE"
        task_registry[task_id]["error"] = str(e)

@app.post("/admin/submit-assets")
def admin_submit_assets(request: AdminSubmissionRequest):
    # Remove from local queue file
    queue_data = read_queue()
    updated_queue = [item for item in queue_data if item["user_id"] != request.user_id]
    if len(updated_queue) != len(queue_data):
        write_queue(updated_queue)

    # Generate a simple task ID based on asset ID
    task_id = f"task_{request.user_id}"
    task_registry[task_id] = {"status": "PENDING", "asset_id": request.user_id}

    # Kick off in a background thread — no Redis/Celery needed
    thread = threading.Thread(
        target=_run_scraping_job,
        args=(task_id, request.model_dump()),
        daemon=True
    )
    thread.start()

    return {"status": "processing", "task_id": task_id, "message": "Scraping started in background..."}

@app.get("/status/{task_id}")
def get_task_status(task_id: str):
    """Poll the status of a running scrape job."""
    if task_id.startswith("queue_"):
        return {"task_id": task_id, "task_status": "QUEUED_WAITING_FOR_ADMIN"}

    info = task_registry.get(task_id)
    if not info:
        # Unknown task — may have completed before server restart
        return {"task_id": task_id, "task_status": "UNKNOWN"}

    return {
        "task_id": task_id,
        "task_status": info.get("status", "UNKNOWN"),
        "result": info.get("result"),
        "error": info.get("error")
    }