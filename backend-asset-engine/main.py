# main.py
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from tasks import process_admin_submission_task
# pyrefly: ignore [missing-import]
from celery.result import AsyncResult
import os
import json
import datetime

app = FastAPI(title="NotebookLM Backend Asset Engine - Productized Service")

# 🌐 1. ENABLE CORS FOR FRONTEND COMMUNICATION
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open to all origins for easy web/mobile interface testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
@app.head("/")
def read_root():
    return {"status": "alive"}

# 📁 2. MOUNT STATIC STORAGE PATH FOR DOWNLOADS
STATIC_DIR = "/app/data/assets"
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

QUEUE_FILE = "/app/data/queue.json"

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

class UserUploadRequest(BaseModel):
    user_id: str
    pdf_url: str = None
    assets_requested: list[str] = ["flashcards", "quizzes", "podcast", "video", "mindmap"]
    student_preferences: str = None
    custom_instructions: str = None

class AdminSubmissionRequest(BaseModel):
    user_id: str
    artifact_urls: list[str] = []
    podcast_audio: str = None
    video_overview: str = None
    infographic: str = None
    slide_deck: str = None
    study_report: str = None
    data_table: str = None

@app.post("/generate")
def user_upload_pdf(request: UserUploadRequest):
    """
    Step 1: User uploads PDF. 
    Appends the request to our JSON queue for the Admin to process.
    """
    queue_data = read_queue()
    
    # Check if user is already in queue
    existing = next((item for item in queue_data if item["user_id"] == request.user_id), None)
    if existing:
        return {"status": "queued", "task_id": f"queue_{request.user_id}", "message": "You are already in the queue!"}
        
    queue_data.append({
        "user_id": request.user_id,
        "pdf_url": request.pdf_url,
        "assets_requested": request.assets_requested,
        "student_preferences": request.student_preferences,
        "custom_instructions": request.custom_instructions,
        "timestamp": datetime.datetime.utcnow().isoformat()
    })
    write_queue(queue_data)
    
    queue_task_id = f"queue_{request.user_id}"
    return {"status": "queued", "task_id": queue_task_id, "message": "Your request is in the queue! Admin has been notified."}

@app.get("/admin/queue")
def admin_get_queue():
    """
    Returns the list of all students waiting for their assets, including their tailored prompts!
    """
    return {"queue": read_queue()}

@app.post("/admin/submit-assets")
def admin_submit_assets(request: AdminSubmissionRequest):
    """
    Step 2: Admin submits the completed assets.
    The backend takes the public links and scrapes them.
    Also removes the user from the waiting queue.
    """
    # Remove from queue
    queue_data = read_queue()
    updated_queue = [item for item in queue_data if item["user_id"] != request.user_id]
    if len(updated_queue) != len(queue_data):
        write_queue(updated_queue)
        
    task = process_admin_submission_task.delay(request.model_dump())
    return {"status": "processing", "task_id": task.id, "message": "Extracting JSON from public links..."}

@app.get("/status/{task_id}")
def get_task_status(task_id: str):
    """
    Poll the status of a queued task. Separates interactive data arrays 
    from downloadable static files.
    """
    if task_id.startswith("queue_"):
        return {"task_id": task_id, "task_status": "QUEUED_WAITING_FOR_ADMIN"}

    task_result = AsyncResult(task_id)
    raw_result = task_result.result if task_result.ready() else None
    
    formatted_response = {
        "task_id": task_id,
        "task_status": task_result.status,
        "interactive_assets": {
            "flashcards": [],
            "quizzes": [],
            "mindmap": None,
        },
        "downloadable_files": {
            "podcast_audio": None,
            "video_overview": None,
            "infographic": None,
            "slide_deck": None
        }
    }
    
    if raw_result and isinstance(raw_result, dict):
        # 🎮 1. POPULATE INTERACTIVE COMPONENT DATA
        formatted_response["interactive_assets"]["flashcards"] = raw_result.get("flashcards", [])
        formatted_response["interactive_assets"]["quizzes"] = raw_result.get("quizzes", [])
        formatted_response["interactive_assets"]["mindmap"] = raw_result.get("mindmap", None)
        
        # 📥 2. POPULATE WEB DOWNLOAD LINK ROUTING
        # For now, it returns whatever URL the Admin passed in, or a static local path
        if raw_result.get("podcast_audio"):
            formatted_response["downloadable_files"]["podcast_audio"] = raw_result.get("podcast_audio")
        if raw_result.get("video_overview"):
            formatted_response["downloadable_files"]["video_overview"] = raw_result.get("video_overview")
        if raw_result.get("infographic"):
            formatted_response["downloadable_files"]["infographic"] = raw_result.get("infographic")
        if raw_result.get("slide_deck"):
            formatted_response["downloadable_files"]["slide_deck"] = raw_result.get("slide_deck")
            
    return formatted_response