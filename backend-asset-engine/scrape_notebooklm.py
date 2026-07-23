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
        browser = await p.chromium.launch(headless=True)
        try:
            # Load auth state if it exists
            auth_state_path = Path("auth_state.json")
            context_kwargs = {}
            if auth_state_path.exists():
                context_kwargs["storage_state"] = str(auth_state_path)
                logger.info("Loading Google auth state from auth_state.json")
            
            context = await browser.new_context(**context_kwargs)
            page = await context.new_page()
            logger.info(f"Navigating to NotebookLM session: {notebook_url}")
            await page.goto(notebook_url, wait_until="domcontentloaded", timeout=90000)
            await asyncio.sleep(3)

            # Get all links on the page
            content = await page.content()
            
            # Extract all href links
            all_links = await page.query_selector_all("a[href]")
            artifact_links = []
            
            for link in all_links:
                href = await link.get_attribute("href")
                if href:
                    # Normalize relative URLs
                    full_url = urljoin(notebook_url, href)
                    artifact_links.append(full_url)
            
            logger.info(f"Found {len(artifact_links)} total links on page")
            
            # Also search in page HTML for artifact patterns
            html_artifact_patterns = re.findall(
                r'https?://notebooklm\.google\.com/notebook/[^"\'\s<>]+/artifact/[^"\'\s<>]+',
                content
            )
            
            # Combine and deduplicate
            all_artifact_urls = list(set(artifact_links + html_artifact_patterns))
            result["raw_artifacts"] = all_artifact_urls
            
            logger.info(f"Found {len(all_artifact_urls)} artifact URLs")
            
            # Classify artifacts by URL pattern and link text
            for url in all_artifact_urls:
                lower_url = url.lower()
                
                # Get link text if available
                link_text = ""
                try:
                    link_elem = await page.query_selector(f"a[href='{url}']")
                    if link_elem:
                        link_text = (await link_elem.inner_text()).lower()
                except Exception:
                    pass
                
                # Classify by URL pattern and text
                if any(kw in lower_url or kw in link_text for kw in ["flashcard", "flash"]):
                    if not result["flashcards_url"]:
                        result["flashcards_url"] = url
                        logger.info(f"Found flashcards: {url}")
                
                elif any(kw in lower_url or kw in link_text for kw in ["quiz", "test", "assessment"]):
                    if not result["quizzes_url"]:
                        result["quizzes_url"] = url
                        logger.info(f"Found quiz: {url}")
                
                elif any(kw in lower_url or kw in link_text for kw in ["mindmap", "mind-map", "mind_map", "map"]):
                    if not result["mindmap_url"]:
                        result["mindmap_url"] = url
                        logger.info(f"Found mindmap: {url}")
                
                elif any(kw in lower_url or kw in link_text for kw in ["audio", "podcast", "listen"]):
                    if not result["audio_url"]:
                        result["audio_url"] = url
                        logger.info(f"Found audio/podcast: {url}")
                
                elif any(kw in lower_url or kw in link_text for kw in ["video", "watch"]):
                    if not result["video_url"]:
                        result["video_url"] = url
                        logger.info(f"Found video: {url}")

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
        browser = await p.chromium.launch(headless=True)
        try:
            # Load auth state if it exists
            auth_state_path = Path("auth_state.json")
            context_kwargs = {}
            if auth_state_path.exists():
                context_kwargs["storage_state"] = str(auth_state_path)
                logger.info("Loading Google auth state from auth_state.json")
            
            context = await browser.new_context(**context_kwargs)
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