from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class OCRResult:
    text: str
    page_count: int


class OCRAdapter(ABC):
    @abstractmethod
    async def extract(self, data: bytes) -> OCRResult:
        """Extract plain text from document bytes."""
