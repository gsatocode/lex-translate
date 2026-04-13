import asyncio

from worker.pipeline.ocr.base import OCRAdapter, OCRResult


class PaddleOCRAdapter(OCRAdapter):
    """OCR adapter for scanned PDFs and images using PaddleOCR.

    PaddleOCR is a large optional dependency (~3 GB). Install it with:
        pip install paddlepaddle paddleocr
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
        import io

        import paddleocr
        from PIL import Image

        ocr = paddleocr.PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
        image = Image.open(io.BytesIO(data))
        result = ocr.ocr(image, cls=True)
        lines = []
        for page in result or []:
            for line in page or []:
                if line and len(line) >= 2 and line[1]:
                    lines.append(line[1][0])
        text = "\n".join(lines)
        return OCRResult(text=text, page_count=1)
