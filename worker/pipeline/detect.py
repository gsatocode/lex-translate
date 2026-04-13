import asyncio
import logging

from langdetect import detect, LangDetectException

logger = logging.getLogger(__name__)

_SAMPLE_CHARS = 5000  # langdetect is accurate on 500+ chars; limit for very large docs


async def detect_language(text: str) -> str:
    """Detect the language of text. Returns ISO 639-1 code or 'unknown'."""
    if not text.strip():
        return "unknown"
    sample = text[:_SAMPLE_CHARS]
    try:
        return await asyncio.to_thread(detect, sample)
    except (LangDetectException, Exception) as exc:
        logger.warning("Language detection failed: %s", exc)
        return "unknown"
