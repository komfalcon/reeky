"""
Content deduplication for notebook artifacts.

Computes content hashes for scraped artifacts and checks against existing
records to avoid re-processing unchanged content.
"""

import hashlib
import json
from typing import Optional


def compute_content_hash(
    flashcards: Optional[list] = None,
    quizzes: Optional[list] = None,
    mindmap: Optional[dict] = None,
    audio_url: Optional[str] = None,
    video_url: Optional[str] = None,
) -> str:
    """
    Compute a deterministic hash from artifact content.

    Uses canonical JSON so identical content always produces the same hash.
    """
    payload = {
        "flashcards": flashcards or [],
        "quizzes": quizzes or [],
        "mindmap": mindmap or {},
        "audio_url": audio_url,
        "video_url": video_url,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def find_duplicate_asset_id(rows: list, content_hash: str) -> Optional[str]:
    """
    Check if an existing asset bundle already has this content hash.
    Returns the asset bundle ID if found, else None.
    """
    for row in rows:
        existing_hash = row.get("content_hash")
        if existing_hash and existing_hash == content_hash:
            return row.get("id")
    return None