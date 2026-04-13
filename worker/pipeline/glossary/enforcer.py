import re


def filter_glossary(
    glossary: dict[str, str],
    chunk_text: str,
) -> dict[str, str]:
    """Return only the glossary entries whose source_term appears in chunk_text.

    Case-insensitive matching. Injects only relevant terms to minimise prompt size.
    """
    return {
        term: translation
        for term, translation in glossary.items()
        if re.search(re.escape(term), chunk_text, re.IGNORECASE)
    }
