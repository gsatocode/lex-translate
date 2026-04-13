import re
from dataclasses import dataclass, field

# ~800 tokens at ~4 chars/token — conservative for legal prose
_MAX_CHARS = 3200

# Legal section markers that must never be at the end of a chunk
_LEGAL_MARKER = re.compile(
    r"^(ARTICLE|CLAUSE|§|WHEREAS|THEREFORE|RECITAL|SCHEDULE|EXHIBIT|ANNEX)",
    re.MULTILINE | re.IGNORECASE,
)

# Sentence boundary — end of a sentence followed by whitespace
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


@dataclass
class Chunk:
    index: int
    text: str
    context: str = field(default="")  # tail of previous chunk (2 sentences)


def _tail(text: str) -> str:
    """Return the last 2 sentences of text for use as overlap context."""
    sentences = _SENTENCE_END.split(text.strip())
    return " ".join(sentences[-2:]) if len(sentences) >= 2 else sentences[-1] if sentences else ""


def chunk_text(text: str) -> list[Chunk]:
    """Split text into chunks on paragraph boundaries.

    Rules:
    - Max ~3200 chars per chunk (~800 tokens).
    - Paragraphs that start with a legal marker (ARTICLE, CLAUSE, §, WHEREAS, ...)
      always start a new chunk and are never left at the end of the previous one.
    - Each chunk carries the last 2 sentences of the previous chunk as context.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return []

    chunks: list[Chunk] = []
    current_parts: list[str] = []
    current_len = 0
    prev_tail = ""

    def _flush() -> None:
        nonlocal prev_tail
        chunk_text_str = "\n\n".join(current_parts)
        chunks.append(Chunk(index=len(chunks), text=chunk_text_str, context=prev_tail))
        prev_tail = _tail(chunk_text_str)
        current_parts.clear()
        nonlocal current_len
        current_len = 0

    for para in paragraphs:
        is_legal_marker = bool(_LEGAL_MARKER.match(para))

        # If this paragraph is a legal marker, flush pending content first so
        # the marker starts a fresh chunk.
        if is_legal_marker and current_parts:
            _flush()

        # If adding this paragraph would exceed the limit (and it's not a marker),
        # flush current content first.
        if not is_legal_marker and current_parts and current_len + len(para) > _MAX_CHARS:
            _flush()

        current_parts.append(para)
        current_len += len(para)

    if current_parts:
        _flush()

    return chunks
