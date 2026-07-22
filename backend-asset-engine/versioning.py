"""
Asset bundle versioning logic.

Supports version history plus manual overrides when the admin edits an
artifact after auto-scraping or re-submits a notebook for a student.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger("reeky-versioning")


def new_version_payload(
    existing: Optional[Dict[str, Any]],
    incoming: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Merge existing asset content with incoming changes into a new version.

    Keeps existing data as the base and applies any non-empty fields from
    the incoming payload. This preserves unchanged artifacts while allowing
    admin overrides.
    """
    base = dict(existing or {})
    incoming = incoming or {}

    # Pull top-level scalar fields first
    for key in [
        "podcast_audio",
        "video_overview",
        "infographic",
        "slide_deck",
        "study_report",
        "data_table",
        "notebook_source_url",
        "content_hash",
    ]:
        if incoming.get(key) not in (None, "", [], {}):
            base[key] = incoming[key]

    # Merge interactive arrays / objects
    for key in ["flashcards", "quizzes", "mindmap"]:
        if key in incoming and incoming[key] not in (None, "", [], {}):
            base[key] = incoming[key]

    base.setdefault("version", 1)
    base["version"] = int(base.get("version", 1)) + 1

    return base


def summarize_version(bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Build a compact version history entry from a bundle.
    """
    return {
        "version": bundle.get("version", 1),
        "createdAt": bundle.get("createdAt") or datetime.datetime.utcnow().isoformat(),
        "updatedAt": datetime.datetime.utcnow().isoformat(),
        "status": bundle.get("status", "UNKNOWN"),
        "title": bundle.get("title"),
    }