# tasks.py
import asyncio
# pyrefly: ignore [missing-import]
from celery import Celery

from classify import (
    parse_app_data_string,
    classify_extracted_data,
    attach_media,
)

app = Celery('tasks')
app.config_from_object('celeryconfig')


async def scrape_notebooklm_url(url: str):
    """
    Playwright scraper: pull Quiz / Flashcard / Mindmap JSON from a NotebookLM public link.
    Uses DOM get_attribute so embedded quotes in JSON do not truncate the payload.
    """
    # pyrefly: ignore [missing-import]
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        try:
            page = await browser.new_page()
            print(f"Navigating to URL: {url}")
            await page.goto(url, wait_until="domcontentloaded", timeout=90000)
            await asyncio.sleep(5)
            try:
                await page.wait_for_selector("[data-app-data]", timeout=15000)
            except Exception:
                pass

            print(f"Found {len(page.frames)} frames on the page.")
            extracted_data = None

            for i, frame in enumerate(page.frames):
                try:
                    elem = await frame.query_selector("[data-app-data]")
                    if not elem:
                        continue
                    raw = await elem.get_attribute("data-app-data")
                    if not raw:
                        continue
                    print(f"Found data-app-data in frame {i}")
                    extracted_data = parse_app_data_string(raw)
                    break
                except Exception as e:
                    print(f"Error parsing frame {i}: {e}")

            if extracted_data is None:
                try:
                    elem = await page.query_selector("[data-app-data]")
                    if elem:
                        raw = await elem.get_attribute("data-app-data")
                        extracted_data = parse_app_data_string(raw)
                except Exception as e:
                    print(f"Error parsing main page app data: {e}")

            return extracted_data
        finally:
            await browser.close()


def process_submission_sync(config: dict):
    """Synchronous wrapper for the async scraper."""
    results = {}
    artifact_urls = config.get("artifact_urls")
    if not artifact_urls or not isinstance(artifact_urls, list):
        artifact_urls = []

    clean_urls = []
    for url in artifact_urls:
        if url and isinstance(url, str) and url.strip().startswith("http"):
            clean_urls.append(url.strip())

    if not clean_urls:
        print("No valid NotebookLM URLs provided. Passing through media only.")
        attach_media(config, results)
        return results

    async def run_scraper():
        failures = []
        for url in clean_urls:
            try:
                data = await scrape_notebooklm_url(url)
                if not data:
                    failures.append(url)
                    print(f"Failed to extract data from {url}")
                    continue
                classify_extracted_data(data, results)
            except Exception as e:
                failures.append(url)
                print(f"Scrape error for {url}: {e}")
        if failures and not any(k in results for k in ("flashcards", "quizzes", "mindmap")):
            raise RuntimeError(
                f"Could not extract interactive assets from any URL. Failed: {failures}"
            )

    asyncio.run(run_scraper())
    attach_media(config, results)
    return results


@app.task(bind=True, name="tasks.process_admin_submission_task")
def process_admin_submission_task(self, config: dict):
    print("Orchestrator: Processing admin submission...")
    try:
        results = process_submission_sync(config)
        print("Orchestrator: Pipeline succeeded.")
        return results
    except Exception as e:
        print(f"Orchestrator: Pipeline failed: {e}")
        raise
