"""Offline unit tests — no Celery/Playwright/Redis required."""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from classify import classify_extracted_data, parse_app_data_string, attach_media


def test_parse_app_data_with_quotes():
    raw = '{"f":"What?","b":"Answer with \\"quotes\\""}'
    data = parse_app_data_string(raw)
    assert data["f"] == "What?"
    assert "quotes" in data["b"]


def test_classify_raw_flashcards():
    results = {}
    classify_extracted_data(
        [{"f": "Q1", "b": "A1"}, {"f": "Q2", "b": "A2"}],
        results,
    )
    assert len(results["flashcards"]) == 2


def test_classify_wrapped_flashcards():
    results = {}
    classify_extracted_data({"flashcards": [{"f": "Q", "b": "A"}], "topics": {}}, results)
    assert len(results["flashcards"]) == 1


def test_classify_quiz():
    results = {}
    classify_extracted_data(
        [
            {
                "question": "Why?",
                "answerOptions": [
                    {"text": "A", "isCorrect": True},
                    {"text": "B", "isCorrect": False},
                ],
            }
        ],
        results,
    )
    assert len(results["quizzes"]) == 1


def test_classify_mindmap():
    results = {}
    classify_extracted_data(
        {"name": "Root", "children": [{"name": "Child", "children": []}]},
        results,
    )
    assert results["mindmap"]["name"] == "Root"


def test_media_passthrough():
    results = {}
    attach_media(
        {
            "podcast_audio": "https://cdn.example.com/a.mp3",
            "video_overview": "https://cdn.example.com/v.mp4",
        },
        results,
    )
    assert results["podcast_audio"].endswith("a.mp3")
    assert results["video_overview"].endswith("v.mp4")


def test_final_assets_fixture_shape():
    fixture = os.path.join(os.path.dirname(__file__), "final_assets.json")
    if not os.path.exists(fixture):
        return
    with open(fixture, encoding="utf-8") as f:
        payload = json.load(f)
    interactive = payload.get("interactive_assets") or {}
    results = {}
    if interactive.get("flashcards"):
        classify_extracted_data(interactive["flashcards"], results)
    if interactive.get("quizzes"):
        classify_extracted_data(interactive["quizzes"], results)
    assert results.get("flashcards")
    assert results.get("quizzes")


if __name__ == "__main__":
    tests = [
        test_parse_app_data_with_quotes,
        test_classify_raw_flashcards,
        test_classify_wrapped_flashcards,
        test_classify_quiz,
        test_classify_mindmap,
        test_media_passthrough,
        test_final_assets_fixture_shape,
    ]
    failed = 0
    for fn in tests:
        try:
            fn()
            print(f"PASS {fn.__name__}")
        except Exception as e:
            failed += 1
            print(f"FAIL {fn.__name__}: {e}")
    if failed:
        print(f"\n{failed} failed")
        sys.exit(1)
    print(f"\nAll {len(tests)} tests passed")
