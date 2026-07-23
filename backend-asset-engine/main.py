# main.py
from __future__ import annotations

import os
import json
import datetime
import logging
from typing import Optional, List

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from celery.result import AsyncResult
from celery import Celery

from tasks import process_admin_submission_task
from video_processor import process_video_submission
from scrape_notebooklm import scrape_notebooklm_session
from paths import DATA_DIR, STATIC_DIR, QUEUE_FILE, ensure_data_dirs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("reeky-engine")

ensure_data_dirs()

app = FastAPI(title="Reeky Asset Engine")

ADMIN_API_KEY = os.getenv("ADMIN_API_KEY", "")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Celery app for health checks
celery_app = Celery("tasks")
celery_app.config_from_object("celeryconfig")


def require_admin(x_admin_key: Optional[str] = Header(default=None)):
    if not ADMIN_API_KEY:
        logger.warning("ADMIN_API_KEY is not set — admin routes are open")
        return
    if not x_admin_key:
        raise HTTPException(status_code=401, detail="Admin API key is required (x-admin-key header)")
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized admin access")


@app.get("/")
@app.head("/")
def read_root():
    return {"status": "alive", "service": "reeky-asset-engine"}


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def read_queue():
    """Legacy JSON file queue — maintained for backward compatibility.
    New deployments should use the core-api database as the source of truth."""
    if not os.path.exists(QUEUE_FILE):
        return []
    try:
        with open(QUEUE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read queue file: {e}")
        return []


def write_queue(data):
    os.makedirs(os.path.dirname(QUEUE_FILE), exist_ok=True)
    with open(QUEUE_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


class UserUploadRequest(BaseModel):
    user_id: str
    pdf_url: Optional[str] = None
    assets_requested: List[str] = Field(
        default_factory=lambda: ["flashcards", "quizzes", "podcast", "video", "mindmap"]
    )
    student_preferences: Optional[str] = None
    custom_instructions: Optional[str] = None


class AdminSubmissionRequest(BaseModel):
    user_id: str
    artifact_urls: List[str] = Field(default_factory=list)
    podcast_audio: Optional[str] = None
    video_overview: Optional[str] = None
    infographic: Optional[str] = None
    slide_deck: Optional[str] = None
    study_report: Optional[str] = None
    data_table: Optional[str] = None


class VideoProcessRequest(BaseModel):
    video_url: str
    asset_id: str


class ScrapeNotebookRequest(BaseModel):
    notebook_url: str


@app.post("/generate")
def user_upload_pdf(request: UserUploadRequest, _: None = Depends(require_admin)):
    """Legacy local JSON queue (core-api uses MySQL). Kept for compatibility."""
    queue_data = read_queue()
    existing = next((item for item in queue_data if item["user_id"] == request.user_id), None)
    if existing:
        return {
            "status": "queued",
            "task_id": f"queue_{request.user_id}",
            "message": "You are already in the queue!",
        }

    queue_data.append(
        {
            "user_id": request.user_id,
            "pdf_url": request.pdf_url,
            "assets_requested": request.assets_requested,
            "student_preferences": request.student_preferences,
            "custom_instructions": request.custom_instructions,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }
    )
    write_queue(queue_data)
    return {
        "status": "queued",
        "task_id": f"queue_{request.user_id}",
        "message": "Your request is in the queue!",
    }


@app.get("/admin/queue")
def admin_get_queue(_: None = Depends(require_admin)):
    return {"queue": read_queue()}


from fastapi import BackgroundTasks
from task_store import save_task_status

@app.post("/admin/submit-assets")
def admin_submit_assets(request: AdminSubmissionRequest, background_tasks: BackgroundTasks, _: None = Depends(require_admin)):
    queue_data = read_queue()
    updated_queue = [item for item in queue_data if item["user_id"] != request.user_id]
    if len(updated_queue) != len(queue_data):
        write_queue(updated_queue)

    task_id = f"local_{request.user_id}"
    try:
        task = process_admin_submission_task.delay(request.model_dump())
        task_id = task.id
        logger.info(f"Enqueued submission task via Celery: {task_id}")
    except Exception as e:
        logger.warning(f"Celery task enqueue failed: {e}. Falling back to local BackgroundTasks.")
        save_task_status(task_id, "PENDING")
        background_tasks.add_task(process_admin_submission_task, request.model_dump(), task_id)

    return {
        "status": "processing",
        "task_id": task_id,
        "message": "Extracting JSON from public links...",
    }


@app.post("/scrape-notebooklm")
async def scrape_notebooklm(request: ScrapeNotebookRequest, _: None = Depends(require_admin)):
    """
    Scrape a NotebookLM session URL and extract all artifacts.
    Returns a structured list of detected artifact URLs.
    """
    try:
        logger.info(f"Scraping NotebookLM session: {request.notebook_url}")
        result = await scrape_notebooklm_session(request.notebook_url)
        
        return {
            "status": "success",
            "notebook_url": request.notebook_url,
            "artifacts": result,
            "found_count": sum(1 for k, v in result.items() if k != "raw_artifacts" and v is not None)
        }
    except Exception as e:
        logger.error(f"NotebookLM scraping failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/video/process")
async def process_video(request: VideoProcessRequest, _: None = Depends(require_admin)):
    """
    Process a video URL: download → trim last 3 seconds → upload to storage.
    Returns a task_id for polling.
    """
    try:
        logger.info(f"Starting video processing for asset {request.asset_id}")
        result = await process_video_submission(request.video_url, request.asset_id)
        
        if result["status"] == "success":
            return {
                "status": "SUCCESS",
                "task_id": f"video_{request.asset_id}",
                "video_url": result["video_url"],
            }
        else:
            return {
                "status": "FAILURE",
                "task_id": f"video_{request.asset_id}",
                "error": result.get("error", "Video processing failed"),
            }
    except Exception as e:
        logger.error(f"Video processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{task_id}")
def get_task_status(task_id: str):
    if task_id.startswith("queue_"):
        return {"task_id": task_id, "task_status": "QUEUED_WAITING_FOR_ADMIN"}

    from task_store import get_task_status_local
    local_status = get_task_status_local(task_id)

    status = "PENDING"
    raw_result = None
    error_msg = None

    if local_status:
        status = local_status.get("status", "PENDING")
        raw_result = local_status.get("result")
        error_msg = local_status.get("error")
    else:
        try:
            task_result = AsyncResult(task_id)
            status = task_result.status
            if status == "FAILURE":
                error_msg = str(task_result.result) if task_result.result is not None else "Task failed"
            else:
                raw_result = task_result.result if task_result.ready() else None
        except Exception as e:
            logger.warning(f"Could not connect to Celery to fetch status for {task_id}: {e}")
            status = "PENDING"

    formatted_response = {
        "task_id": task_id,
        "task_status": status,
        "error": error_msg,
        "interactive_assets": {
            "flashcards": [],
            "quizzes": [],
            "mindmap": None,
        },
        "downloadable_files": {
            "podcast_audio": None,
            "video_overview": None,
            "infographic": None,
            "slide_deck": None,
            "study_report": None,
            "data_table": None,
        },
    }

    if status == "FAILURE":
        return formatted_response

    if raw_result and isinstance(raw_result, dict):
        formatted_response["interactive_assets"]["flashcards"] = raw_result.get("flashcards", [])
        formatted_response["interactive_assets"]["quizzes"] = raw_result.get("quizzes", [])
        formatted_response["interactive_assets"]["mindmap"] = raw_result.get("mindmap", None)
        for key in formatted_response["downloadable_files"]:
            if raw_result.get(key):
                formatted_response["downloadable_files"][key] = raw_result.get(key)

    return formatted_response


@app.get("/health")
def health():
    """
    Comprehensive health check that verifies:
    - Service status
    - Data directory accessibility
    - Celery/Redis broker connectivity
    - Admin auth configuration
    """
    checks = {
        "service": True,
        "data_dir": os.path.isdir(DATA_DIR),
        "celery_broker": False,
        "celery_backend": False,
    }
    errors = {}

    # Check Celery broker connectivity
    try:
        broker_url = os.getenv("CELERY_BROKER_URL", "")
        if broker_url:
            inspect = celery_app.control.inspect()
            stats = inspect.stats()
            checks["celery_broker"] = stats is not None
        else:
            checks["celery_broker"] = None  # Not configured
    except Exception as e:
        errors["celery_broker"] = str(e)
        checks["celery_broker"] = False

    # Check Celery result backend
    try:
        result_backend = os.getenv("CELERY_RESULT_BACKEND", "")
        if result_backend:
            checks["celery_backend"] = True  # Can't easily check without making a task
        else:
            checks["celery_backend"] = None  # Not configured
    except Exception as e:
        errors["celery_backend"] = str(e)
        checks["celery_backend"] = False

    all_healthy = all(
        v is True or v is None for v in checks.values()
    )

    return {
        "status": "ok" if all_healthy else "degraded",
        "data_dir": DATA_DIR,
        "admin_auth": bool(ADMIN_API_KEY),
        "checks": checks,
        **({"errors": errors} if errors else {}),
    }