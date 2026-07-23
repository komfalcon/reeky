"""
Video Processor for NotebookLM Artifacts

Handles:
1. Extracting direct video URLs from NotebookLM artifact pages
2. Downloading videos
3. Trimming last 3 seconds with FFmpeg
4. Uploading to Supabase Storage (S3-compatible)
"""

import os
import re
import json
import asyncio
import logging
from pathlib import Path
from urllib.parse import urlparse

from playwright.async_api import async_playwright

logger = logging.getLogger("reeky-video-processor")


async def extract_video_url_from_notebooklm(artifact_url: str) -> str | None:
    """
    Scrape a NotebookLM artifact page and extract the direct video file URL.
    
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

            # Try to find video element
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

            # Method 4: Search for blob URLs or stream URLs
            blob_matches = re.findall(r'"(blob:https?://[^"]+)"', content)
            if blob_matches:
                logger.warning(f"Found blob URLs (not directly downloadable): {blob_matches[:3]}")
                return None

            logger.warning("No video URL found on NotebookLM artifact page")
            return None

        except Exception as e:
            logger.error(f"Failed to extract video URL: {e}")
            return None
        finally:
            await browser.close()


async def download_video(url: str, output_path: str) -> bool:
    """
    Download a video file from a URL to local storage.
    Uses aiohttp for async download.
    """
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Failed to download video: HTTP {response.status}")
                    return False
                
                content = await response.read()
                Path(output_path).parent.mkdir(parents=True, exist_ok=True)
                
                with open(output_path, 'wb') as f:
                    f.write(content)
                
                logger.info(f"Downloaded video to {output_path} ({len(content)} bytes)")
                return True
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return False


def trim_video_ffmpeg(input_path: str, output_path: str, trim_seconds: int = 3) -> bool:
    """
    Trim the last N seconds from a video using FFmpeg.
    
    Args:
        input_path: Path to input video
        output_path: Path to save trimmed video
        trim_seconds: Number of seconds to trim from the end
    
    Returns:
        True if successful, False otherwise
    """
    try:
        import subprocess
        
        # FFmpeg command to trim last N seconds from both video and audio
        # The trim filter keeps everything from 0 to (duration - trim_seconds)
        cmd = [
            'ffmpeg',
            '-i', input_path,
            '-vf', f'trim=start=0:end=end-{trim_seconds},setpts=PTS-STARTPTS',
            '-af', f'atrim=start=0:end=end-{trim_seconds},asetpts=PTS-STARTPTS',
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-y',  # Overwrite output file if it exists
            output_path
        ]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            logger.error(f"FFmpeg failed: {result.stderr}")
            return False
        
        logger.info(f"Trimmed video saved to {output_path}")
        return True
        
    except Exception as e:
        logger.error(f"FFmpeg trim failed: {e}")
        return False


async def process_video_submission(video_url: str, asset_id: str) -> dict:
    """
    Main entry point for video processing.
    
    Flow:
    1. Download video from URL
    2. Trim last 3 seconds with FFmpeg
    3. Upload to Supabase Storage
    4. Return public URL
    
    Args:
        video_url: Direct URL to video file or NotebookLM artifact URL
        asset_id: Asset bundle ID for naming
    
    Returns:
        dict with 'video_url' and 'status'
    """
    # Setup paths
    temp_dir = Path(os.getenv("TEMP_DIR", "/tmp/reeky-videos"))
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    input_path = temp_dir / f"{asset_id}-input.mp4"
    output_path = temp_dir / f"{asset_id}-trimmed.mp4"
    
    try:
        # Approach 1: Extract direct video link from NotebookLM and return it directly (bypassing download/trim/upload)
        if "notebooklm.google.com" in video_url:
            logger.info(f"Detecting NotebookLM page. Extracting raw video stream from: {video_url}")
            extracted_url = await extract_video_url_from_notebooklm(video_url)
            if not extracted_url:
                return {
                    "status": "error",
                    "error": "Failed to extract direct video URL from NotebookLM page",
                    "video_url": None
                }
            logger.info(f"Approach 1 Success! Returning extracted raw video stream: {extracted_url}")
            return {
                "status": "success",
                "video_url": extracted_url,
                "error": None
            }

        # Step 1: Download video (Approach 2 fallback)
        logger.info(f"Downloading video from: {video_url}")
        download_success = await download_video(video_url, str(input_path))
        if not download_success:
            return {
                "status": "error",
                "error": "Failed to download video",
                "video_url": None
            }
        
        # Step 2: Trim video
        logger.info(f"Trimming last 3 seconds from {input_path}")
        trim_success = trim_video_ffmpeg(str(input_path), str(output_path), trim_seconds=3)
        if not trim_success:
            return {
                "status": "error",
                "error": "Failed to trim video",
                "video_url": None
            }
        
        # Step 3: Upload to Supabase Storage
        from storage import StorageManager
        storage = StorageManager()
        
        with open(output_path, 'rb') as f:
            video_bytes = f.read()
        
        filename = f"videos/{asset_id}.mp4"
        public_url = storage.save_file(video_bytes, filename, content_type="video/mp4")
        
        logger.info(f"Video uploaded to: {public_url}")
        
        return {
            "status": "success",
            "video_url": public_url,
            "error": None
        }
        
    except Exception as e:
        logger.error(f"Video processing failed: {e}")
        return {
            "status": "error",
            "error": str(e),
            "video_url": None
        }
    finally:
        # Cleanup temp files
        try:
            if input_path.exists():
                input_path.unlink()
            if output_path.exists():
                output_path.unlink()
        except Exception:
            pass