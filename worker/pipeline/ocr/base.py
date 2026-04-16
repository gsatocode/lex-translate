from abc import ABC, abstractmethod
from dataclasses import dataclass
import re


@dataclass
class OCRResult:
    text: str
    page_count: int


class OCRAdapter(ABC):
    @abstractmethod
    async def extract(self, data: bytes) -> OCRResult:
        """Extract plain text from document bytes."""


def has_meaningful_text(text: str, min_chars: int = 20) -> bool:
    """Treat PDFs with only a tiny text layer as scanned and fallback to OCR."""
    return len(re.findall(r"\w", text, flags=re.UNICODE)) >= min_chars
