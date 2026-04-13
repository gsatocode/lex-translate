import asyncio
import io

from docx import Document as DocxDocument

from worker.pipeline.ocr.base import OCRAdapter, OCRResult


class DocxAdapter(OCRAdapter):
    async def extract(self, data: bytes) -> OCRResult:
        return await asyncio.to_thread(self._extract_sync, data)

    def _extract_sync(self, data: bytes) -> OCRResult:
        doc = DocxDocument(io.BytesIO(data))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        text = "\n\n".join(paragraphs)
        return OCRResult(text=text, page_count=1)
