from api.config import settings
from worker.pipeline.ocr.base import OCRAdapter, OCRResult, has_meaningful_text
from worker.pipeline.ocr.paddle_adapter import PaddleOCRAdapter
from worker.pipeline.ocr.pdfplumber_adapter import PDFPlumberAdapter


class PDFOCRAdapter(OCRAdapter):
    """Prefer embedded PDF text, then fallback to OCR for scanned PDFs."""

    def __init__(
        self,
        *,
        text_adapter: OCRAdapter | None = None,
        scanned_adapter: OCRAdapter | None = None,
        min_text_chars: int | None = None,
    ) -> None:
        if text_adapter is None:
            text_adapter = PDFPlumberAdapter()
        if scanned_adapter is None:
            scanned_adapter = PaddleOCRAdapter()

        self._text_adapter = text_adapter
        self._scanned_adapter = scanned_adapter
        self._min_text_chars = min_text_chars or settings.ocr_min_text_chars

    async def extract(self, data: bytes) -> OCRResult:
        text_result = await self._text_adapter.extract(data)
        if has_meaningful_text(text_result.text, self._min_text_chars):
            return text_result
        return await self._scanned_adapter.extract(data)
