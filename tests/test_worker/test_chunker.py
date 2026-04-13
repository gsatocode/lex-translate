from worker.pipeline.segmentation.chunker import chunk_text, Chunk


def test_single_short_paragraph_is_one_chunk():
    text = "The applicant was born on 01/01/1990 in Lisbon."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert chunks[0].index == 0
    assert chunks[0].text == text
    assert chunks[0].context == ""


def test_multiple_short_paragraphs_fit_in_one_chunk():
    text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph."
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert "First paragraph" in chunks[0].text
    assert "Third paragraph" in chunks[0].text


def test_long_text_splits_into_multiple_chunks():
    # 5 paragraphs of ~700 chars each -> should produce multiple chunks (max ~3200 chars)
    para = "A" * 700
    text = "\n\n".join([para] * 5)
    chunks = chunk_text(text)
    assert len(chunks) >= 2


def test_second_chunk_has_context_from_first():
    para = "A" * 700
    text = "\n\n".join([para] * 5)
    chunks = chunk_text(text)
    assert len(chunks) >= 2
    # Second chunk context must be non-empty (tail of first chunk)
    assert chunks[1].context != ""


def test_chunk_indices_are_sequential():
    para = "B" * 700
    text = "\n\n".join([para] * 10)
    chunks = chunk_text(text)
    for i, chunk in enumerate(chunks):
        assert chunk.index == i


def test_legal_marker_paragraph_never_splits_mid_marker():
    # A legal marker that would push over the limit should start a new chunk,
    # not get split from the text that follows it.
    long_para = "X" * 3000
    marker_para = "ARTICLE 1 — Definitions and Scope of Application"
    content_para = "All terms defined herein shall apply."
    text = f"{long_para}\n\n{marker_para}\n\n{content_para}"
    chunks = chunk_text(text)
    # The marker + content should be together in one chunk
    marker_chunk = next(c for c in chunks if "ARTICLE 1" in c.text)
    assert "Definitions" in marker_chunk.text


def test_empty_paragraphs_are_skipped():
    text = "\n\nFirst.\n\n\n\nSecond.\n\n"
    chunks = chunk_text(text)
    assert len(chunks) == 1
    assert "First." in chunks[0].text
    assert "Second." in chunks[0].text


def test_returns_empty_list_for_empty_input():
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []
