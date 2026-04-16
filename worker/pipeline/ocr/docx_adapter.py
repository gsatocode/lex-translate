import asyncio
import io

from worker.pipeline.ocr.base import OCRAdapter, OCRResult


class DocxAdapter(OCRAdapter):
    async def extract(self, data: bytes) -> OCRResult:
        try:
            import docx  # noqa: F401
        except ImportError as exc:
            raise RuntimeError(
                "python-docx not installed. Install python-docx to process DOCX files."
            ) from exc
        return await asyncio.to_thread(self._extract_sync, data)

    def _extract_sync(self, data: bytes) -> OCRResult:
        from docx import Document as DocxDocument

        doc = DocxDocument(io.BytesIO(data))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n\n".join(paragraphs)
        return OCRResult(text=text, page_count=1)
