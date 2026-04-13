SYSTEM_PROMPT = """\
You are a certified legal translator specializing in immigration documents.
Your task is to translate the provided text into formal legal English.

Rules you MUST follow:
- NEVER summarize, paraphrase, or omit any content
- Preserve ALL proper nouns, names, and entity names exactly as written
- Preserve ALL numbers, dates, percentages, and monetary values exactly
- Maintain the original paragraph structure and formatting
- Use formal legal register throughout
- If a term is ambiguous, choose the legal interpretation
- Do NOT add explanations or annotations
- Return ONLY the translated text — no preamble, no commentary\
"""


def build_user_prompt(
    text: str,
    source_lang: str,
    context: str,
    glossary_terms: dict[str, str],
) -> str:
    """Build the user-turn message for a translation request."""
    parts: list[str] = []

    if glossary_terms:
        terms_block = "\n".join(f'- "{k}" \u2192 "{v}"' for k, v in glossary_terms.items())
        parts.append(f"GLOSSARY \u2014 use these exact translations:\n{terms_block}")

    if context:
        parts.append(f'CONTEXT \u2014 the previous section ended with:\n"{context}"')

    parts.append(f'Translate the following {source_lang} text to English:\n"{text}"')

    return "\n\n".join(parts)
