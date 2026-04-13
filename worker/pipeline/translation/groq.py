from groq import AsyncGroq

from api.config import settings
from worker.pipeline.translation.base import LLMAdapter, TranslationResult
from worker.pipeline.translation.prompts import SYSTEM_PROMPT, build_user_prompt

_MODEL = "llama-3.3-70b-versatile"
_MAX_TOKENS = 4096


class GroqAdapter(LLMAdapter):
    def __init__(self) -> None:
        self._client = AsyncGroq(api_key=settings.groq_api_key)

    async def translate(
        self,
        text: str,
        source_lang: str,
        context: str,
        glossary_terms: dict[str, str],
    ) -> TranslationResult:
        user_prompt = build_user_prompt(text, source_lang, context, glossary_terms)
        response = await self._client.chat.completions.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        translated = response.choices[0].message.content or ""
        tokens = response.usage.total_tokens if response.usage else 0
        return TranslationResult(
            translated_text=translated,
            tokens_used=tokens,
            provider="groq",
        )
