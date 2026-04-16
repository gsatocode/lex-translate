import asyncio
import io

from worker.pipeline.ocr.base import OCRAdapter, OCRResult


class PDFPlumberAdapter(OCRAdapter):
    async def extract(self, data: bytes) -> OCRResult:
        try:
            import pdfplumber  # noqa: F401
        except ImportError as exc:
            raise RuntimeError(
                "pdfplumber not installed. Install pdfplumber to process text-based PDFs."
            ) from exc
        return await asyncio.to_thread(self._extract_sync, data)

    def _extract_sync(self, data: bytes) -> OCRResult:
        import pdfplumber

        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
            text = "\n\n".join(p for p in pages if p.strip())
            return OCRResult(text=text, page_count=len(pdf.pages))
