import httpx
import anthropic

from api.config import settings
from worker.pipeline.translation.base import LLMAdapter, TranslationResult
from worker.pipeline.translation.prompts import SYSTEM_PROMPT, build_user_prompt

_MODEL = "claude-opus-4-6"
_MAX_TOKENS = 4096
_LLM_TIMEOUT = httpx.Timeout(connect=5.0, read=120.0, write=10.0, pool=5.0)


class AnthropicAdapter(LLMAdapter):
    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic(
            api_key=settings.anthropic_api_key,
            timeout=_LLM_TIMEOUT,
        )

    async def translate(
        self,
        text: str,
        source_lang: str,
        context: str,
        glossary_terms: dict[str, str],
    ) -> TranslationResult:
        user_prompt = build_user_prompt(text, source_lang, context, glossary_terms)
        message = await self._client.messages.create(
            model=_MODEL,
            max_tokens=_MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}],
        )
        if not message.content:
            raise RuntimeError(
                f"Anthropic returned empty content (stop_reason={message.stop_reason!r})"
            )
        translated = message.content[0].text
        tokens = message.usage.input_tokens + message.usage.output_tokens
        return TranslationResult(
            translated_text=translated,
            tokens_used=tokens,
            provider="anthropic",
        )
