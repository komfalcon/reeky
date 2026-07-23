"""
NotebookLM Session Scraper

Scrapes a NotebookLM notebook/session page and extracts all artifact URLs:
- Flashcards
- Quizzes
- Mindmaps
- Audio/Podcasts
- Videos

This enables the "one notebook per student" workflow where admin pastes
a single notebook URL and the system automatically discovers all artifacts.
"""

import os
import re
import json
import asyncio
import logging
from pathlib import Path
from urllib.parse import urljoin

from playwright.async_api import async_playwright

logger = logging.getLogger("reeky-scraper")


async def scrape_notebooklm_session(notebook_url: str) -> dict:
    """
    Scrape a NotebookLM notebook page and extract all artifact URLs.
    
    Args:
        notebook_url: URL to the NotebookLM notebook/session page
            e.g. https://notebooklm.google.com/notebook/abc123
    
    Returns:
        dict with keys:
            - flashcards_url: str or None
            - quizzes_url: str or None
            - mindmap_url: str or None
            - audio_url: str or None
            - video_url: str or None
            - raw_artifacts: list of all detected artifact URLs
    """
    result = {
        "flashcards_url": None,
        "quizzes_url": None,
        "mindmap_url": None,
        "audio_url": None,
        "video_url": None,
        "raw_artifacts": []
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        try:
            # Load auth state if it exists
            auth_state_path = Path("auth_state.json")
            context_kwargs = {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            if auth_state_path.exists():
                context_kwargs["storage_state"] = str(auth_state_path)
                logger.info("Loading Google auth state from auth_state.json")
            
            context = await browser.new_context(**context_kwargs)
            await context.add_init_script("delete navigator.__proto__.webdriver;")
            page = await context.new_page()
            logger.info(f"Navigating to NotebookLM session: {notebook_url}")
            await page.goto(notebook_url, wait_until="domcontentloaded", timeout=90000)
            
            # Sleep 10s to let workspace render Studio panels
            logger.info("Waiting 10 seconds for NotebookLM workspace to render...")
            await asyncio.sleep(10)

            # Parse Notebook ID from URL
            notebook_id_match = re.search(r"/notebook/([a-zA-Z0-9\-]+)", notebook_url)
            if not notebook_id_match:
                logger.error("Failed to parse notebook ID from URL")
                return result
            notebook_id = notebook_id_match.group(1)

            # Query all artifact library items in the DOM
            items = await page.query_selector_all("artifact-library-item")
            logger.info(f"Found {len(items)} artifact items in DOM.")

            artifact_links = []

            for item in items:
                # Extract artifact ID from HTML attributes
                html = await item.inner_html()
                id_match = re.search(r"artifact-labels-([a-fA-F0-9\-]{36})", html)
                if not id_match:
                    continue
                
                artifact_id = id_match.group(1)
                full_url = f"https://notebooklm.google.com/notebook/{notebook_id}/artifact/{artifact_id}"
                artifact_links.append(full_url)

                # Extract title
                title_elem = await item.query_selector(".artifact-title")
                title = (await title_elem.inner_text() if title_elem else "Unknown").strip().lower()

                # Extract icon name
                icon_elem = await item.query_selector("mat-icon")
                icon_name = (await icon_elem.inner_text() if icon_elem else "").strip().lower()

                # Extract button description
                btn_elem = await item.query_selector("button")
                desc = (await btn_elem.get_attribute("aria-description") if btn_elem else "").strip().lower()

                logger.info(f"Detected Artifact: Title='{title}', Icon='{icon_name}', Desc='{desc}', URL={full_url}")

                # Classify artifact
                if any(kw in title or kw in icon_name or kw in desc for kw in ["flashcard", "cards_star"]):
                    if not result["flashcards_url"]:
                        result["flashcards_url"] = full_url
                        logger.info(f"Classified Flashcards URL: {full_url}")
                
                elif any(kw in title or kw in icon_name or kw in desc for kw in ["quiz", "test", "assessment"]):
                    if not result["quizzes_url"]:
                        result["quizzes_url"] = full_url
                        logger.info(f"Classified Quiz URL: {full_url}")
                
                elif any(kw in title or kw in icon_name or kw in desc for kw in ["mindmap", "mind-map", "mind_map", "flowchart"]):
                    if not result["mindmap_url"]:
                        result["mindmap_url"] = full_url
                        logger.info(f"Classified Mindmap URL: {full_url}")
                
                elif any(kw in title or kw in icon_name or kw in desc for kw in ["audio", "podcast", "listen", "audio_magic_eraser"]):
                    if not result["audio_url"]:
                        result["audio_url"] = full_url
                        logger.info(f"Classified Audio/Podcast URL: {full_url}")
                
                elif any(kw in title or kw in icon_name or kw in desc for kw in ["video", "watch", "subscriptions"]):
                    if not result["video_url"]:
                        result["video_url"] = full_url
                        logger.info(f"Classified Video URL: {full_url}")

            result["raw_artifacts"] = list(set(artifact_links))
            
            # Log summary
            found_types = [k for k, v in result.items() if v and k != "raw_artifacts"]
            logger.info(f"Classification summary: {', '.join(found_types) if found_types else 'None'}")

            return result

        except Exception as e:
            logger.error(f"Failed to scrape NotebookLM session: {e}")
            return result
        finally:
            await browser.close()


async def extract_video_url_from_notebooklm(artifact_url: str) -> str | None:
    """
    Scrape a NotebookLM artifact page and extract the direct video file URL.
    Kept for backward compatibility with existing code.
    
    Args:
        artifact_url: e.g. https://notebooklm.google.com/notebook/.../artifact/...
    
    Returns:
        Direct MP4 URL or None if not found
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        try:
            # Load auth state if it exists
            auth_state_path = Path("auth_state.json")
            context_kwargs = {
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            if auth_state_path.exists():
                context_kwargs["storage_state"] = str(auth_state_path)
                logger.info("Loading Google auth state from auth_state.json")
            
            context = await browser.new_context(**context_kwargs)
            await context.add_init_script("delete navigator.__proto__.webdriver;")
            page = await context.new_page()
            logger.info(f"Navigating to NotebookLM artifact: {artifact_url}")
            await page.goto(artifact_url, wait_until="domcontentloaded", timeout=90000)
            await asyncio.sleep(3)

            video_url = None
            
            # Method 1: Look for <video> tag with src
            video_element = await page.query_selector("video")
            if video_element:
                video_url = await video_element.get_attribute("src")
                if video_url:
                    logger.info(f"Found video src: {video_url}")
                    return video_url

            # Method 2: Look for <source> tag inside <video>
            source_element = await page.query_selector("video source")
            if source_element:
                video_url = await source_element.get_attribute("src")
                if video_url:
                    logger.info(f"Found video source: {video_url}")
                    return video_url

            # Method 3: Search page HTML for .mp4 URLs
            content = await page.content()
            mp4_matches = re.findall(r'https?://[^\s"\'<>]+\.mp4[^\s"\'<>]*', content)
            if mp4_matches:
                video_url = mp4_matches[0]
                logger.info(f"Found MP4 URL in HTML: {video_url}")
                return video_url

            logger.warning("No video URL found on NotebookLM artifact page")
            return None

        except Exception as e:
            logger.error(f"Failed to extract video URL: {e}")
            return None
        finally:
            await browser.close()


# CLI test
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python scrape_notebooklm.py <notebook_url>")
        sys.exit(1)
    
    notebook_url = sys.argv[1]
    result = asyncio.run(scrape_notebooklm_session(notebook_url))
    print(json.dumps(result, indent=2))