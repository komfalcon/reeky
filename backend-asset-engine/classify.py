# classify.py — pure helpers (no Celery/Playwright) for NotebookLM payload shapes
import html as html_lib
import json


def parse_app_data_string(raw: str):
    if not raw:
        return None
    clean = html_lib.unescape(raw)
    return json.loads(clean)


def looks_like_flashcards(items) -> bool:
    if not isinstance(items, list) or not items:
        return False
    first = items[0]
    return isinstance(first, dict) and ("f" in first or "front" in first or "q" in first)


def looks_like_quiz(items) -> bool:
    if not isinstance(items, list) or not items:
        return False
    first = items[0]
    return isinstance(first, dict) and (
        ("question" in first and "answerOptions" in first)
        or ("q" in first and "options" in first)
        or ("text" in first and "options" in first)
    )


def looks_like_mindmap(data) -> bool:
    return isinstance(data, dict) and (
        ("name" in data and "children" in data)
        or ("nodes" in data and ("edges" in data or "connections" in data))
    )


def classify_extracted_data(data, results: dict):
    """Normalize NotebookLM wrappers into flashcards / quizzes / mindmap keys."""
    if data is None:
        return

    if isinstance(data, dict):
        if looks_like_flashcards(data.get("flashcards")):
            results["flashcards"] = data["flashcards"]
            print(f"Extracted {len(data['flashcards'])} flashcards (wrapped)")

        quiz = data.get("quizzes") or data.get("quiz") or data.get("questions")
        if looks_like_quiz(quiz):
            results["quizzes"] = quiz
            print(f"Extracted quiz with {len(quiz)} questions (wrapped)")

        mm = data.get("mindmap")
        if looks_like_mindmap(mm):
            results["mindmap"] = mm
            print(f"Extracted mindmap: {mm.get('name', 'graph')}")
            return

        if looks_like_mindmap(data):
            results["mindmap"] = data
            print(f"Extracted mindmap: {data.get('name', 'graph')}")
            return

    if isinstance(data, list) and data:
        if looks_like_flashcards(data):
            results["flashcards"] = data
            print(f"Extracted {len(data)} flashcards")
        elif looks_like_quiz(data):
            results["quizzes"] = data
            print(f"Extracted quiz with {len(data)} questions")


def attach_media(config: dict, results: dict):
    for key in (
        "podcast_audio",
        "video_overview",
        "infographic",
        "slide_deck",
        "study_report",
        "data_table",
    ):
        if config.get(key):
            results[key] = config[key]
