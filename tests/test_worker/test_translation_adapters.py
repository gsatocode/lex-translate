import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from worker.pipeline.translation.anthropic import AnthropicAdapter
from worker.pipeline.translation.groq import GroqAdapter
from worker.pipeline.translation.openai import OpenAIAdapter


# ---------------------------------------------------------------------------
# AnthropicAdapter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_anthropic_adapter_returns_translation_result():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="The defendant appeared.")]
    mock_message.usage.input_tokens = 80
    mock_message.usage.output_tokens = 20
    mock_message.stop_reason = "end_turn"

    with patch("worker.pipeline.translation.anthropic.anthropic.AsyncAnthropic") as MockClient:
        MockClient.return_value.messages.create = AsyncMock(return_value=mock_message)
        with patch("worker.pipeline.translation.anthropic.settings") as mock_settings:
            mock_settings.anthropic_api_key = "sk-test"
            adapter = AnthropicAdapter()
            result = await adapter.translate("O réu compareceu.", "pt", "", {})

    assert result.translated_text == "The defendant appeared."
    assert result.tokens_used == 100
    assert result.provider == "anthropic"


@pytest.mark.asyncio
async def test_anthropic_adapter_raises_on_empty_content():
    mock_message = MagicMock()
    mock_message.content = []
    mock_message.stop_reason = "content_filtered"

    with patch("worker.pipeline.translation.anthropic.anthropic.AsyncAnthropic") as MockClient:
        MockClient.return_value.messages.create = AsyncMock(return_value=mock_message)
        with patch("worker.pipeline.translation.anthropic.settings") as mock_settings:
            mock_settings.anthropic_api_key = "sk-test"
            adapter = AnthropicAdapter()
            with pytest.raises(RuntimeError, match="empty content"):
                await adapter.translate("texto", "pt", "", {})


@pytest.mark.asyncio
async def test_anthropic_adapter_passes_glossary_and_context():
    mock_message = MagicMock()
    mock_message.content = [MagicMock(text="Translated.")]
    mock_message.usage.input_tokens = 50
    mock_message.usage.output_tokens = 10
    mock_message.stop_reason = "end_turn"

    with patch("worker.pipeline.translation.anthropic.anthropic.AsyncAnthropic") as MockClient:
        create_mock = AsyncMock(return_value=mock_message)
        MockClient.return_value.messages.create = create_mock
        with patch("worker.pipeline.translation.anthropic.settings") as mock_settings:
            mock_settings.anthropic_api_key = "sk-test"
            adapter = AnthropicAdapter()
            await adapter.translate("texto", "pt", "prior ctx", {"réu": "defendant"})

    call_kwargs = create_mock.call_args.kwargs
    user_content = call_kwargs["messages"][0]["content"]
    assert "GLOSSARY" in user_content
    assert "CONTEXT" in user_content


# ---------------------------------------------------------------------------
# OpenAIAdapter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_openai_adapter_returns_translation_result():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "The applicant arrived."
    mock_response.usage.total_tokens = 120

    with patch("worker.pipeline.translation.openai.AsyncOpenAI") as MockClient:
        MockClient.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("worker.pipeline.translation.openai.settings") as mock_settings:
            mock_settings.openai_api_key = "sk-test"
            adapter = OpenAIAdapter()
            result = await adapter.translate("texto", "pt", "", {})

    assert result.translated_text == "The applicant arrived."
    assert result.tokens_used == 120
    assert result.provider == "openai"


@pytest.mark.asyncio
async def test_openai_adapter_handles_none_usage():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Translated."
    mock_response.usage = None  # Can be None in certain configurations

    with patch("worker.pipeline.translation.openai.AsyncOpenAI") as MockClient:
        MockClient.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("worker.pipeline.translation.openai.settings") as mock_settings:
            mock_settings.openai_api_key = "sk-test"
            adapter = OpenAIAdapter()
            result = await adapter.translate("texto", "pt", "", {})

    assert result.tokens_used == 0
    assert result.translated_text == "Translated."


@pytest.mark.asyncio
async def test_openai_adapter_raises_on_empty_choices():
    mock_response = MagicMock()
    mock_response.choices = []

    with patch("worker.pipeline.translation.openai.AsyncOpenAI") as MockClient:
        MockClient.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("worker.pipeline.translation.openai.settings") as mock_settings:
            mock_settings.openai_api_key = "sk-test"
            adapter = OpenAIAdapter()
            with pytest.raises(RuntimeError, match="empty choices"):
                await adapter.translate("texto", "pt", "", {})


# ---------------------------------------------------------------------------
# GroqAdapter
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_groq_adapter_returns_translation_result():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "The contract was signed."
    mock_response.usage.total_tokens = 90

    with patch("worker.pipeline.translation.groq.AsyncGroq") as MockClient:
        MockClient.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("worker.pipeline.translation.groq.settings") as mock_settings:
            mock_settings.groq_api_key = "gsk-test"
            adapter = GroqAdapter()
            result = await adapter.translate("texto", "pt", "", {})

    assert result.translated_text == "The contract was signed."
    assert result.tokens_used == 90
    assert result.provider == "groq"


@pytest.mark.asyncio
async def test_groq_adapter_raises_on_empty_choices():
    mock_response = MagicMock()
    mock_response.choices = []

    with patch("worker.pipeline.translation.groq.AsyncGroq") as MockClient:
        MockClient.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("worker.pipeline.translation.groq.settings") as mock_settings:
            mock_settings.groq_api_key = "gsk-test"
            adapter = GroqAdapter()
            with pytest.raises(RuntimeError, match="empty choices"):
                await adapter.translate("texto", "pt", "", {})


@pytest.mark.asyncio
async def test_groq_adapter_handles_none_usage():
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Translated."
    mock_response.usage = None

    with patch("worker.pipeline.translation.groq.AsyncGroq") as MockClient:
        MockClient.return_value.chat.completions.create = AsyncMock(return_value=mock_response)
        with patch("worker.pipeline.translation.groq.settings") as mock_settings:
            mock_settings.groq_api_key = "gsk-test"
            adapter = GroqAdapter()
            result = await adapter.translate("texto", "pt", "", {})

    assert result.tokens_used == 0
