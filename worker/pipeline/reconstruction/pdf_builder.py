import io

from reportlab.lib.colors import black
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer


def build_pdf(chunks: list[tuple[str, str]], filename: str) -> bytes:
    """Build a professionally formatted legal PDF from translated chunks.

    Args:
        chunks: List of (original_text, translated_text) pairs.
        filename: Original filename (used in the document header).

    Returns:
        PDF as bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=inch,
        rightMargin=inch,
        topMargin=inch,
        bottomMargin=inch,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "LexTitle",
        parent=styles["Heading1"],
        fontSize=14,
        spaceAfter=14,
        textColor=black,
        fontName="Times-Bold",
    )
    body_style = ParagraphStyle(
        "LexBody",
        parent=styles["Normal"],
        fontSize=11,
        leading=16,
        spaceAfter=8,
        fontName="Times-Roman",
    )

    story = []
    story.append(Paragraph(f"TRANSLATION \u2014 {filename}", title_style))
    story.append(Spacer(1, 0.2 * inch))

    for _, translated in chunks:
        for para_text in translated.split("\n\n"):
            if para_text.strip():
                safe = (
                    para_text
                    .replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;")
                )
                story.append(Paragraph(safe, body_style))
        story.append(Spacer(1, 0.1 * inch))

    doc.build(story)
    return buf.getvalue()
