from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class TranslationResult:
    translated_text: str
    tokens_used: int
    provider: str


class LLMAdapter(ABC):
    @abstractmethod
    async def translate(
        self,
        text: str,
        source_lang: str,
        context: str,
        glossary_terms: dict[str, str],
    ) -> TranslationResult:
        """Translate text into English. Returns translated text + token usage."""
