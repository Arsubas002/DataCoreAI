"""Narrow source guard for ambiguous floating-point shorthand, not SDK typechecking."""

import re

SHORTHAND_LIMIT = re.compile(r"(?<![\w.])\.\s*greatestFiniteMagnitude\b")


def validate_numeric_limits(source: str, name: str) -> None:
    for match in SHORTHAND_LIMIT.finditer(source):
        line = source.count("\n", 0, match.start()) + 1
        raise ValueError(
            f"{name}:{line}: qualify greatestFiniteMagnitude with its scalar type "
            "(e.g. CGFloat for Core Graphics geometry)"
        )
