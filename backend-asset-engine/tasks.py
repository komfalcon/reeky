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
        
        # Load state.json if it exists to bypass Google Login wall
        state_path = "/app/state.json"
        if not os.path.exists(state_path):
            state_path = "state.json" # Fallback to local dir
            
        if os.path.exists(state_path):
            print("🔑 Found state.json! Injecting authenticated session cookies...")
            try:
                with open(state_path, "r", encoding="utf-8") as f:
                    state_data = json.load(f)
                
                # If the user pasted EditThisCookie's raw array directly
                if isinstance(state_data, list):
                    print("🔄 Converting EditThisCookie array format to Playwright format...")
                    
                    # Playwright expects specific sameSite strings, EditThisCookie often puts "unspecified" or "no_restriction"
                    for cookie in state_data:
                        if "sameSite" in cookie:
                            if cookie["sameSite"] == "unspecified":
                                cookie["sameSite"] = "Lax" # Default fallback
                            elif cookie["sameSite"] == "no_restriction":
                                cookie["sameSite"] = "None"
                                
                    state_data = {"cookies": state_data, "origins": []}
                    with open(state_path, "w", encoding="utf-8") as f:
                        json.dump(state_data, f, indent=2)
                elif isinstance(state_data, dict) and "cookies" in state_data:
                    # Fix previously converted state files that still have invalid sameSite values
                    needs_save = False
                    for cookie in state_data["cookies"]:
                        if "sameSite" in cookie:
                            if cookie["sameSite"] == "unspecified":
                                cookie["sameSite"] = "Lax"
                                needs_save = True
                            elif cookie["sameSite"] == "no_restriction":
                                cookie["sameSite"] = "None"
                                needs_save = True
                    if needs_save:
                        with open(state_path, "w", encoding="utf-8") as f:
                            json.dump(state_data, f, indent=2)
            except Exception as e:
                print(f"⚠️ Error reading/converting state.json: {e}")

            context = await b.new_context(storage_state=state_path)
        else:
            print("⚠️ No state.json found. Proceeding without authentication (may hit login wall).")
            context = await b.new_context()
            
        page = await context.new_page()
        
        print(f"🌐 Navigating to URL: {url}")
        await page.goto(url, wait_until="networkidle")
        
        print("⏳ Waiting 10 seconds for the iframe to fully load and render...")
        await asyncio.sleep(10)
        
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
                
        print("DEBUG: Closing browser...")
        try:
            await b.close()
        except Exception as e:
            print(f"DEBUG: Browser close error: {e}")
            
        print("DEBUG: Returning extracted data.")
        return extracted_data

import math
import uuid

def transform_mindmap_to_graph(tree_data):
    nodes = []
    connections = []
    
    # Root node at center
    root_id = str(uuid.uuid4())
    nodes.append({
        "id": root_id,
        "type": "root",
        "title": tree_data.get("name", "Root"),
        "x": 600,
        "y": 400
    })
    
    children = tree_data.get("children", [])
    num_children = len(children)
    
    if num_children > 0:
        radius = 280
        angle_step = (2 * math.pi) / num_children
        for i, child in enumerate(children):
            angle = i * angle_step
            child_x = 600 + (radius * math.cos(angle))
            child_y = 400 + (radius * math.sin(angle))
            child_id = str(uuid.uuid4())
            nodes.append({
                "id": child_id,
                "type": "child",
                "title": child.get("name", "Concept"),
                "x": child_x,
                "y": child_y
            })
            connections.append({"from": root_id, "to": child_id})
            
            # Grandchildren (leaf nodes) spread around the child
            grandchildren = child.get("children", [])
            num_grandchildren = len(grandchildren)
            if num_grandchildren > 0:
                gc_radius = 160
                gc_angle_step = (math.pi) / num_grandchildren
                # Start angle pointing away from root
                base_angle = angle - (math.pi/2) + (gc_angle_step/2)
                for j, gc in enumerate(grandchildren):
                    gc_angle = base_angle + (j * gc_angle_step)
                    gc_x = child_x + (gc_radius * math.cos(gc_angle))
                    gc_y = child_y + (gc_radius * math.sin(gc_angle))
                    gc_id = str(uuid.uuid4())
                    nodes.append({
                        "id": gc_id,
                        "type": "leaf",
                        "title": gc.get("name", "Detail"),
                        "x": gc_x,
                        "y": gc_y
                    })
                    connections.append({"from": child_id, "to": gc_id})
                    
    return {"nodes": nodes, "connections": connections}

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
            
            # Helper function to recursively search for the data we need
            def find_target_data(obj):
                # If we found a string, see if it's our JSON
                if isinstance(obj, str):
                    if obj.strip().startswith('[') or obj.strip().startswith('{'):
                        if '"f"' in obj and '"b"' in obj:
                            try:
                                return "flashcards", json.loads(obj)
                            except: pass
                        if '"question"' in obj and '"answerOptions"' in obj:
                            try:
                                return "quizzes", json.loads(obj)
                            except: pass
                        if '"name"' in obj and '"children"' in obj:
                            try:
                                return "mindmap", json.loads(obj)
                            except: pass
                # If we found a dict, check if it IS the target data
                elif isinstance(obj, dict):
                    if "name" in obj and "children" in obj:
                        return "mindmap", obj
                    if "f" in obj and "b" in obj:
                        return "flashcard_item", obj
                    if "question" in obj and "answerOptions" in obj:
                        return "quiz_item", obj
                    for v in obj.values():
                        res = find_target_data(v)
                        if res: return res
                # If list, search all items
                elif isinstance(obj, list):
                    # Check if this list IS the flashcards/quizzes list
                    if len(obj) > 0 and isinstance(obj[0], dict):
                        if "f" in obj[0] and "b" in obj[0]:
                            return "flashcards", obj
                        if "question" in obj[0] and "answerOptions" in obj[0]:
                            return "quizzes", obj
                    
                    for item in obj:
                        res = find_target_data(item)
                        if res: return res
                return None
            
            target = find_target_data(data)
            if target:
                type_name, payload = target
                if type_name == "flashcards":
                    print(f"✅ Extracted {len(payload)} Flashcards!")
                    results["flashcards"] = payload
                elif type_name == "quizzes":
                    print(f"✅ Extracted Quiz with {len(payload)} questions!")
                    results["quizzes"] = payload
                elif type_name == "mindmap":
                    print(f"✅ Extracted Mindmap (nodes: {len(payload.get('children', []))})")
                    results["mindmap"] = transform_mindmap_to_graph(payload)
                    results["mindmap_raw"] = payload
                elif type_name == "flashcard_item" or type_name == "quiz_item":
                    print(f"✅ Extracted single {type_name}")
                    # In a real app we'd accumulate these, but assuming array wrapper
                    pass
            else:
                print(f"⚠️ Could not find target data inside the extracted JSON structure for {url}")
                
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