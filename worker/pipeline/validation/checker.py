import re
from dataclasses import dataclass, field

_NUMBER_PATTERN = re.compile(r"\b\d+(?:[.,]\d+)*\b")
_DATE_PATTERN = re.compile(
    r"\b(?:\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}|\d{4}[/\-\.]\d{1,2}[/\-\.]\d{1,2})\b"
)
_LENGTH_MIN_RATIO = 0.5
_LENGTH_MAX_RATIO = 2.0


@dataclass
class ValidationIssue:
    type: str
    severity: str   # "error" | "warning"
    description: str
    chunk_index: int


@dataclass
class ValidationResult:
    passed: bool
    issues: list[ValidationIssue] = field(default_factory=list)


def _check_chunk(original: str, translated: str, chunk_index: int) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []

    orig_numbers = set(_NUMBER_PATTERN.findall(original))
    trans_numbers = set(_NUMBER_PATTERN.findall(translated))
    # Dates overlap with the number pattern — subtract dates so we don't double-flag
    orig_dates = set(_DATE_PATTERN.findall(original))
    trans_dates = set(_DATE_PATTERN.findall(translated))
    pure_orig_numbers = orig_numbers - orig_dates
    pure_trans_numbers = trans_numbers - trans_dates

    for n in sorted(pure_orig_numbers - pure_trans_numbers):
        issues.append(ValidationIssue(
            type="missing_number",
            severity="error",
            description=f"Number '{n}' present in original but not found in translation",
            chunk_index=chunk_index,
        ))

    for d in sorted(orig_dates - trans_dates):
        issues.append(ValidationIssue(
            type="missing_date",
            severity="error",
            description=f"Date '{d}' present in original but not found in translation",
            chunk_index=chunk_index,
        ))

    orig_len = len(original)
    if orig_len > 0:
        ratio = len(translated) / orig_len
        if ratio < _LENGTH_MIN_RATIO or ratio > _LENGTH_MAX_RATIO:
            issues.append(ValidationIssue(
                type="length_ratio",
                severity="warning",
                description=(
                    f"Translation length ratio {ratio:.2f} is outside the expected range "
                    f"[{_LENGTH_MIN_RATIO}, {_LENGTH_MAX_RATIO}]"
                ),
                chunk_index=chunk_index,
            ))

    return issues


def validate_translation(chunks: list[tuple[str, str]]) -> ValidationResult:
    """Validate translated chunks against their originals.

    Args:
        chunks: List of (original_text, translated_text) pairs in order.

    Returns:
        ValidationResult with passed=True if no error-severity issues found.
    """
    all_issues: list[ValidationIssue] = []
    for i, (original, translated) in enumerate(chunks):
        all_issues.extend(_check_chunk(original, translated, i))

    errors = [iss for iss in all_issues if iss.severity == "error"]
    return ValidationResult(passed=len(errors) == 0, issues=all_issues)
