# tasks.py
import os
import json
import asyncio
# pyrefly: ignore [missing-import]
from celery import Celery
from storage import StorageManager

app = Celery('tasks')
app.config_from_object('celeryconfig')

storage = StorageManager(use_cloud=False)

async def scrape_notebooklm_url(url: str):
    """
    Native Playwright scraper to extract Quiz or Flashcard data from a Google NotebookLM public link.
    """
    # pyrefly: ignore [missing-import]
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page()
        
        print(f"🌐 Navigating to URL: {url}")
        await page.goto(url, wait_until="networkidle")
        
        print("⏳ Waiting 5 seconds for the iframe to fully load and render...")
        await asyncio.sleep(5)
        
        print(f"✅ Found {len(page.frames)} total frames on the page.")
        
        extracted_data = None
        
        for i, frame in enumerate(page.frames):
            try:
                # Get the raw HTML of the frame
                html = await frame.content()
                
                # Look for the hidden state attribute Google injects into the DOM!
                marker = 'data-app-data="'
                start_idx = html.find(marker)
                
                if start_idx != -1:
                    print(f"--- 🌟 BINGO! FOUND PERFECT JSON STATE IN FRAME {i} ---")
                    
                    # Extract the JSON string embedded inside the HTML attribute
                    start_json = start_idx + len(marker)
                    end_json = html.find('"', start_json)
                    raw_json = html[start_json:end_json]
                    
                    # Use Python's built-in HTML unescaper to perfectly decode it
                    import html as html_lib
                    clean_json = html_lib.unescape(raw_json)
                    
                    # Parse it into a perfect Python dictionary!
                    app_data = json.loads(clean_json)
                    extracted_data = app_data
                    break
            except Exception as e:
                print(f"Error parsing frame {i}: {e}")
                
        await b.close()
        
        return extracted_data

def process_submission_sync(config: dict):
    """
    Synchronous wrapper for the async scraper.
    """
    results = {}
    artifact_urls = config.get("artifact_urls")
    if not artifact_urls or not isinstance(artifact_urls, list):
        artifact_urls = []
    
    # Filter only valid http/https URLs to avoid scraping empty or placeholder strings
    clean_urls = []
    for url in artifact_urls:
        if url and isinstance(url, str) and url.strip() and url.strip().startswith("http"):
            clean_urls.append(url.strip())
            
    if not clean_urls:
        print("ℹ️ No valid NotebookLM URLs provided for scraping. Skipping Playwright scraper.")
        # Handle direct media pass-throughs from Admin
        if config.get("podcast_audio"):
            results["podcast_audio"] = config["podcast_audio"]
        if config.get("video_overview"):
            results["video_overview"] = config["video_overview"]
        if config.get("infographic"):
            results["infographic"] = config["infographic"]
        if config.get("slide_deck"):
            results["slide_deck"] = config["slide_deck"]
        if config.get("study_report"):
            results["study_report"] = config["study_report"]
        if config.get("data_table"):
            results["data_table"] = config["data_table"]
        return results
    
    async def run_scraper():
        for url in clean_urls:
            data = await scrape_notebooklm_url(url)
            if not data:
                print(f"⚠️ Failed to extract data from {url}")
                continue
                
            # Classify the extracted JSON based on its structure
            if isinstance(data, list) and len(data) > 0:
                first_item = data[0]
                if "f" in first_item and "b" in first_item:
                    print(f"✅ Extracted {len(data)} Flashcards!")
                    results["flashcards"] = data
                elif "question" in first_item and "answerOptions" in first_item:
                    print(f"✅ Extracted Quiz with {len(data)} questions!")
                    results["quizzes"] = data
            elif isinstance(data, dict):
                if "name" in data and "children" in data:
                    print(f"✅ Extracted Mindmap: {data.get('name')}")
                    results["mindmap"] = data
                
    # Run the async loop
    asyncio.run(run_scraper())
    
    # Handle direct media pass-throughs from Admin
    if config.get("podcast_audio"):
        results["podcast_audio"] = config["podcast_audio"]
    if config.get("video_overview"):
        results["video_overview"] = config["video_overview"]
    if config.get("infographic"):
        results["infographic"] = config["infographic"]
    if config.get("slide_deck"):
        results["slide_deck"] = config["slide_deck"]
    if config.get("study_report"):
        results["study_report"] = config["study_report"]
    if config.get("data_table"):
        results["data_table"] = config["data_table"]
        
    return results

@app.task
def process_admin_submission_task(config: dict):
    """
    Production Core Orchestrator for the Productized Service model.
    Receives public links and media from the Admin Dashboard, scrapes the links, and finalizes the asset bundle.
    """
    print("⚡ Orchestrator: Processing Admin Submission...")
    try:
        results = process_submission_sync(config)
        print("✅ Orchestrator: Pipeline succeeded gracefully!")
        return results
    except Exception as e:
        print(f"❌ Orchestrator: Pipeline suffered a fatal error: {e}")
        raise