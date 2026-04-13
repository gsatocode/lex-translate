from worker.pipeline.validation.checker import validate_translation, ValidationResult, ValidationIssue


def test_clean_translation_passes():
    chunks = [
        ("Born on 01/01/1990 in Lisbon.", "Born on 01/01/1990 in Lisbon."),
    ]
    result = validate_translation(chunks)
    assert result.passed is True
    assert result.issues == []


def test_missing_number_is_flagged():
    chunks = [
        ("Document number 12345 issued on 03/03/2020.", "Document issued on 03/03/2020."),
    ]
    result = validate_translation(chunks)
    errors = [i for i in result.issues if i.type == "missing_number"]
    assert len(errors) >= 1
    assert errors[0].severity == "error"
    assert "12345" in errors[0].description


def test_missing_date_is_flagged():
    chunks = [
        ("Issued on 15/06/2019.", "Issued today."),
    ]
    result = validate_translation(chunks)
    date_errors = [i for i in result.issues if i.type == "missing_date"]
    assert len(date_errors) >= 1
    assert "15/06/2019" in date_errors[0].description


def test_length_ratio_too_short_is_flagged():
    original = "A" * 1000
    translated = "B" * 100  # ratio = 0.1 — below 0.5 threshold
    chunks = [(original, translated)]
    result = validate_translation(chunks)
    ratio_warnings = [i for i in result.issues if i.type == "length_ratio"]
    assert len(ratio_warnings) == 1
    assert ratio_warnings[0].severity == "warning"


def test_length_ratio_too_long_is_flagged():
    original = "A" * 100
    translated = "B" * 500  # ratio = 5.0 — above 2.0 threshold
    chunks = [(original, translated)]
    result = validate_translation(chunks)
    ratio_warnings = [i for i in result.issues if i.type == "length_ratio"]
    assert len(ratio_warnings) == 1


def test_passed_is_false_when_errors_exist():
    chunks = [("Number 99999 here.", "No numbers here.")]
    result = validate_translation(chunks)
    assert result.passed is False


def test_passed_is_true_when_only_warnings():
    # Long translation (warning) but all numbers/dates present
    original = "A" * 100
    translated = "B" * 500
    chunks = [(original, translated)]
    result = validate_translation(chunks)
    errors = [i for i in result.issues if i.severity == "error"]
    assert len(errors) == 0
    # passed = True because no errors (warnings are non-blocking)
    assert result.passed is True


def test_chunk_index_is_recorded_in_issues():
    chunks = [
        ("All good here.", "All good here."),
        ("Number 42 missing.", "Number missing."),
    ]
    result = validate_translation(chunks)
    issues_chunk1 = [i for i in result.issues if i.chunk_index == 1]
    assert len(issues_chunk1) >= 1
