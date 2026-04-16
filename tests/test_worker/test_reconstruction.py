import io

from docx import Document as DocxDocument
from worker.pipeline.reconstruction.pdf_builder import build_pdf
from worker.pipeline.reconstruction.docx_builder import build_docx


CHUNKS = [
    ("Primeiro paragrafo original.", "First translated paragraph."),
    ("Segundo paragrafo com data 01/01/2020.", "Second paragraph with date 01/01/2020."),
]


def test_build_pdf_returns_bytes():
    result = build_pdf(CHUNKS, "contract.pdf")
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_build_pdf_is_valid_pdf():
    result = build_pdf(CHUNKS, "contract.pdf")
    # PDF files start with %PDF-
    assert result[:5] == b"%PDF-"


def test_build_pdf_with_special_chars():
    chunks = [("original", "Translation with <b>tags</b> & ampersands.")]
    # Should not raise
    result = build_pdf(chunks, "test.pdf")
    assert result[:5] == b"%PDF-"


def test_build_docx_returns_bytes():
    result = build_docx(CHUNKS, "contract.docx")
    assert isinstance(result, bytes)
    assert len(result) > 0


def test_build_docx_is_valid_docx():
    result = build_docx(CHUNKS, "contract.docx")
    # Should parse without error
    doc = DocxDocument(io.BytesIO(result))
    full_text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    assert "First translated paragraph" in full_text
    assert "Second paragraph" in full_text


def test_build_docx_empty_chunks():
    result = build_docx([], "empty.docx")
    assert isinstance(result, bytes)
    assert len(result) > 0
