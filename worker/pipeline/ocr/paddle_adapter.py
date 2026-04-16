import asyncio
from functools import lru_cache
import io
from typing import TYPE_CHECKING

from api.config import settings
from worker.pipeline.ocr.base import OCRAdapter, OCRResult

if TYPE_CHECKING:
    from PIL import Image


class PaddleOCRAdapter(OCRAdapter):
    """OCR adapter for scanned PDFs and images using PaddleOCR.

    PaddleOCR is a large optional dependency. PDF OCR also needs pypdfium2.
    """

    async def extract(self, data: bytes) -> OCRResult:
        try:
            import paddleocr  # noqa: F401
        except ImportError as exc:
            raise RuntimeError(
                "PaddleOCR not installed. Install paddlepaddle and paddleocr to process "
                "scanned documents and images."
            ) from exc
        return await asyncio.to_thread(self._extract_sync, data)

    def _extract_sync(self, data: bytes) -> OCRResult:
        ocr = _build_ocr_engine(settings.ocr_paddle_lang)
        images = self._load_images(data)
        lines = []
        for image in images:
            result = ocr.ocr(image, cls=True)
            for page in result or []:
                for line in page or []:
                    if line and len(line) >= 2 and line[1]:
                        lines.append(line[1][0])
        text = "\n".join(lines)
        return OCRResult(text=text, page_count=len(images))

    def _load_images(self, data: bytes) -> list["Image.Image"]:
        from PIL import Image

        if data.startswith(b"%PDF"):
            return self._render_pdf_pages(data)

        image = Image.open(io.BytesIO(data))
        return [image.convert("RGB")]

    def _render_pdf_pages(self, data: bytes) -> list["Image.Image"]:
        try:
            import pypdfium2 as pdfium
        except ImportError as exc:
            raise RuntimeError(
                "PDF OCR fallback requires pypdfium2. Install pypdfium2 to process "
                "scanned PDF documents."
            ) from exc

        images: list[Image.Image] = []
        pdf = pdfium.PdfDocument(data)
        for index in range(len(pdf)):
            page = pdf[index]
            bitmap = page.render(scale=2)
            image = bitmap.to_pil().convert("RGB")
            images.append(image.copy())
        return images


@lru_cache(maxsize=4)
def _build_ocr_engine(lang: str):
    import paddleocr

    return paddleocr.PaddleOCR(use_angle_cls=True, lang=lang, show_log=False)
