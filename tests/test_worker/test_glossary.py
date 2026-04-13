from worker.pipeline.glossary.enforcer import filter_glossary


def test_term_present_in_chunk_is_included():
    glossary = {"requerente": "applicant", "nascimento": "birth"}
    result = filter_glossary(glossary, "O requerente apresentou o documento.")
    assert "requerente" in result
    assert "nascimento" not in result


def test_term_absent_from_chunk_is_excluded():
    glossary = {"requerente": "applicant"}
    result = filter_glossary(glossary, "O documento foi apresentado.")
    assert result == {}


def test_matching_is_case_insensitive():
    glossary = {"Requerente": "applicant"}
    result = filter_glossary(glossary, "O REQUERENTE foi notificado.")
    assert "Requerente" in result


def test_term_with_special_regex_chars_is_escaped():
    # Legal parentheticals like "art. 5(1)" must not raise or silently fail
    glossary = {"art. 5(1)": "Article 5(1)"}
    result = filter_glossary(glossary, "Nos termos do art. 5(1) do diploma.")
    assert "art. 5(1)" in result


def test_term_with_dot_is_escaped():
    glossary = {"p.f.": "please find"}
    result = filter_glossary(glossary, "See p.f. attached.")
    assert "p.f." in result


def test_empty_glossary_returns_empty():
    assert filter_glossary({}, "any text here") == {}


def test_empty_chunk_text_returns_empty():
    glossary = {"requerente": "applicant"}
    assert filter_glossary(glossary, "") == {}


def test_multiple_terms_filtered_correctly():
    glossary = {
        "requerente": "applicant",
        "cônjuge": "spouse",
        "nascimento": "birth",
    }
    text = "O requerente e o cônjuge apresentaram os documentos."
    result = filter_glossary(glossary, text)
    assert "requerente" in result
    assert "cônjuge" in result
    assert "nascimento" not in result
    assert result["requerente"] == "applicant"
    assert result["cônjuge"] == "spouse"
