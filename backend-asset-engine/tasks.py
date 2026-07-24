# tasks.py
import os
import json
import asyncio

# StorageManager is optional - skip gracefully if not available
try:
    from storage import StorageManager
    storage = StorageManager(use_cloud=False)
except Exception:
    storage = None


async def scrape_notebooklm_url(url: str):
    """
    Native Playwright scraper to extract Quiz or Flashcard data from a Google NotebookLM public link.
    """
    # pyrefly: ignore [missing-import]
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True)
        page = await b.new_page()
        
        print(f"Navigating to URL: {url}")
        # Use domcontentloaded instead of networkidle because NotebookLM has background polling that never idles
        await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        
        print(" Waiting 5 seconds for the iframe to fully load and render...")
        await asyncio.sleep(5)
        
        print(f" Found {len(page.frames)} total frames on the page.")
        
        extracted_data = None
        
        for i, frame in enumerate(page.frames):
            try:
                # Get the raw HTML of the frame
                html = await frame.content()
                
                # Look for the hidden state attribute Google injects into the DOM!
                marker = 'data-app-data="'
                start_idx = html.find(marker)
                
                if start_idx != -1:
                    print(f"---  BINGO! FOUND PERFECT JSON STATE IN FRAME {i} ---")
                    
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

def format_scraped_text(data):
    if not data:
        return ""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return "\n\n".join([format_scraped_text(item) for item in data])
    if isinstance(data, dict):
        if "text" in data:
            return str(data["text"])
        if "content" in data:
            return format_scraped_text(data["content"])
        if "body" in data:
            return format_scraped_text(data["body"])
        if "description" in data:
            return str(data["description"])
        return json.dumps(data, indent=2)
    return str(data)

def process_submission_sync(config: dict):
    """
    Synchronous wrapper for the async scraper.
    """
    results = {}
    
    # Check if there are any valid NotebookLM URLs to scrape
    url_fields = [
        "flashcards_url", "quizzes_url", "mindmap_url", 
        "slide_deck_url", "study_report_url", "data_table_url", "infographic_url"
    ]
    
    has_scrape_urls = False
    for field in url_fields:
        url = config.get(field)
        if url and isinstance(url, str) and url.strip().startswith("http"):
            has_scrape_urls = True
            
    # Also support generic artifact_urls list fallback
    artifact_urls = config.get("artifact_urls", [])
    if not isinstance(artifact_urls, list):
        artifact_urls = []
    if len(artifact_urls) > 0:
        has_scrape_urls = True

    if not has_scrape_urls:
        print(" No valid NotebookLM URLs provided for scraping. Skipping Playwright scraper.")
        # Handle direct media/text pass-throughs from Admin
        for field in ["podcast_audio", "video_overview", "infographic", "slide_deck", "study_report", "data_table", "flashcards", "quizzes", "mindmap"]:
            if config.get(field):
                results[field] = config[field]
        return results
    
    async def run_scraper():
        # Scrape specific URLs based on their fields
        if config.get("flashcards_url"):
            print(" Scraping Flashcards...")
            data = await scrape_notebooklm_url(config["flashcards_url"])
            if data:
                results["flashcards"] = data
        elif len(artifact_urls) > 0:
            # Fallback classification for generic URLs
            pass

        if config.get("quizzes_url"):
            print(" Scraping Quiz...")
            data = await scrape_notebooklm_url(config["quizzes_url"])
            if data:
                results["quizzes"] = data

        if config.get("mindmap_url"):
            print(" Scraping Mindmap...")
            data = await scrape_notebooklm_url(config["mindmap_url"])
            if data:
                results["mindmap"] = data

        if config.get("slide_deck_url"):
            print(" Scraping Slide Deck...")
            data = await scrape_notebooklm_url(config["slide_deck_url"])
            if data:
                results["slide_deck"] = format_scraped_text(data)

        if config.get("study_report_url"):
            print(" Scraping Study Report...")
            data = await scrape_notebooklm_url(config["study_report_url"])
            if data:
                results["study_report"] = format_scraped_text(data)

        if config.get("data_table_url"):
            print(" Scraping Data Table...")
            data = await scrape_notebooklm_url(config["data_table_url"])
            if data:
                results["data_table"] = format_scraped_text(data)

        if config.get("infographic_url"):
            print(" Scraping Infographic...")
            data = await scrape_notebooklm_url(config["infographic_url"])
            if data:
                results["infographic"] = format_scraped_text(data)

        # Fallback generic scraper loop if config fields are empty but artifact_urls has data
        if len(artifact_urls) > 0 and not results:
            for url in artifact_urls:
                if not url or not url.strip().startswith("http"):
                    continue
                data = await scrape_notebooklm_url(url)
                if not data:
                    continue
                # Classify the extracted JSON based on its structure
                if isinstance(data, list) and len(data) > 0:
                    first_item = data[0]
                    if "f" in first_item and "b" in first_item:
                        results["flashcards"] = data
                    elif "question" in first_item and "answerOptions" in first_item:
                        results["quizzes"] = data
                elif isinstance(data, dict):
                    if "name" in data and "children" in data:
                        results["mindmap"] = data

    # Run the async loop
    asyncio.run(run_scraper())
    
    # Handle direct media / static text pass-throughs from Admin
    if config.get("podcast_audio"):
        results["podcast_audio"] = config["podcast_audio"]
    if config.get("video_overview"):
        results["video_overview"] = config["video_overview"]
    if config.get("infographic") and not results.get("infographic"):
        results["infographic"] = config["infographic"]
    if config.get("slide_deck") and not results.get("slide_deck"):
        results["slide_deck"] = config["slide_deck"]
    if config.get("study_report") and not results.get("study_report"):
        results["study_report"] = config["study_report"]
    if config.get("data_table") and not results.get("data_table"):
        results["data_table"] = config["data_table"]
        
    return results

def process_admin_submission_task(config: dict):
    """
    Wrapper kept for backwards compatibility.
    Now calls process_submission_sync directly (no Celery needed).
    """
    print(" Orchestrator: Processing Admin Submission...")
    try:
        results = process_submission_sync(config)
        print(" Orchestrator: Pipeline succeeded gracefully!")
        return results
    except Exception as e:
        print(f" Orchestrator: Pipeline suffered a fatal error: {e}")
        raise
