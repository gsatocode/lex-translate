import io

import pytest
from unittest.mock import patch

from worker.pipeline.ocr.base import OCRResult
from worker.pipeline.ocr.pdfplumber_adapter import PDFPlumberAdapter
from worker.pipeline.ocr.docx_adapter import DocxAdapter
from worker.pipeline.ocr.paddle_adapter import PaddleOCRAdapter


@pytest.mark.asyncio
async def test_pdfplumber_extracts_text():
    from reportlab.pdfgen.canvas import Canvas

    buf = io.BytesIO()
    c = Canvas(buf)
    c.drawString(72, 720, "The applicant was born on 01/01/1990.")
    c.save()
    pdf_bytes = buf.getvalue()

    adapter = PDFPlumberAdapter()
    result = await adapter.extract(pdf_bytes)

    assert isinstance(result, OCRResult)
    assert "01/01/1990" in result.text
    assert result.page_count == 1


@pytest.mark.asyncio
async def test_pdfplumber_empty_pdf_returns_empty_text():
    from reportlab.pdfgen.canvas import Canvas

    buf = io.BytesIO()
    c = Canvas(buf)
    c.showPage()
    c.save()
    pdf_bytes = buf.getvalue()

    adapter = PDFPlumberAdapter()
    result = await adapter.extract(pdf_bytes)

    assert result.text == ""
    assert result.page_count == 1


@pytest.mark.asyncio
async def test_docx_adapter_extracts_paragraphs():
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph("First paragraph of legal document.")
    doc.add_paragraph("Second paragraph with date 15/03/2024.")
    buf = io.BytesIO()
    doc.save(buf)

    adapter = DocxAdapter()
    result = await adapter.extract(buf.getvalue())

    assert "First paragraph" in result.text
    assert "15/03/2024" in result.text
    assert result.page_count == 1


@pytest.mark.asyncio
async def test_docx_adapter_skips_empty_paragraphs():
    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_paragraph("")
    doc.add_paragraph("Only real content.")
    doc.add_paragraph("")
    buf = io.BytesIO()
    doc.save(buf)

    adapter = DocxAdapter()
    result = await adapter.extract(buf.getvalue())

    assert result.text == "Only real content."


@pytest.mark.asyncio
async def test_paddle_adapter_raises_without_package():
    adapter = PaddleOCRAdapter()
    with patch.dict("sys.modules", {"paddleocr": None}):
        with pytest.raises(RuntimeError, match="PaddleOCR not installed"):
            await adapter.extract(b"fake image bytes")
