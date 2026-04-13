import pytest
from unittest.mock import patch

from worker.pipeline.detect import detect_language


@pytest.mark.asyncio
async def test_detects_portuguese():
    text = "O requerente nasceu em Lisboa em 1990 e reside em Portugal desde sempre."
    result = await detect_language(text)
    assert result == "pt"


@pytest.mark.asyncio
async def test_detects_spanish():
    text = "El solicitante nació en Madrid y ha vivido en España durante toda su vida."
    result = await detect_language(text)
    assert result == "es"


@pytest.mark.asyncio
async def test_returns_unknown_on_empty_text():
    result = await detect_language("")
    assert result == "unknown"


@pytest.mark.asyncio
async def test_returns_unknown_on_langdetect_exception():
    with patch("worker.pipeline.detect.detect", side_effect=Exception("unreliable")):
        result = await detect_language("???")
    assert result == "unknown"
