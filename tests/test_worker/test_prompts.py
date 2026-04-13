from worker.pipeline.translation.prompts import SYSTEM_PROMPT, build_user_prompt


def test_prompt_contains_source_text():
    prompt = build_user_prompt("O réu compareceu.", "pt", "", {})
    assert "O réu compareceu." in prompt


def test_prompt_contains_source_language():
    prompt = build_user_prompt("texto", "pt", "", {})
    assert "pt" in prompt


def test_prompt_without_glossary_has_no_glossary_block():
    prompt = build_user_prompt("texto", "pt", "", {})
    assert "GLOSSARY" not in prompt


def test_prompt_without_context_has_no_context_block():
    prompt = build_user_prompt("texto", "pt", "", {})
    assert "CONTEXT" not in prompt


def test_prompt_with_glossary_includes_glossary_block():
    prompt = build_user_prompt("texto", "pt", "", {"réu": "defendant"})
    assert "GLOSSARY" in prompt
    assert '"réu"' in prompt
    assert '"defendant"' in prompt


def test_prompt_with_context_includes_context_block():
    prompt = build_user_prompt("texto", "pt", "Previous sentence ended here.", {})
    assert "CONTEXT" in prompt
    assert "Previous sentence ended here." in prompt


def test_glossary_block_appears_before_translation_instruction():
    prompt = build_user_prompt("texto", "pt", "", {"réu": "defendant"})
    glossary_pos = prompt.index("GLOSSARY")
    translate_pos = prompt.index("Translate the following")
    assert glossary_pos < translate_pos


def test_context_block_appears_before_translation_instruction():
    prompt = build_user_prompt("texto", "pt", "prior context", {})
    context_pos = prompt.index("CONTEXT")
    translate_pos = prompt.index("Translate the following")
    assert context_pos < translate_pos


def test_glossary_block_appears_before_context_block():
    prompt = build_user_prompt("texto", "pt", "prior context", {"réu": "defendant"})
    glossary_pos = prompt.index("GLOSSARY")
    context_pos = prompt.index("CONTEXT")
    assert glossary_pos < context_pos


def test_system_prompt_contains_never_summarize_rule():
    # Regression guard: softening this rule must cause a test failure
    assert "NEVER summarize" in SYSTEM_PROMPT


def test_system_prompt_prohibits_paraphrase():
    assert "paraphrase" in SYSTEM_PROMPT


def test_system_prompt_instructs_return_only_translated_text():
    assert "Return ONLY the translated text" in SYSTEM_PROMPT
