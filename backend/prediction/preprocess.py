def preprocess_values(values: list[float] | None) -> list[float]:
    if not values:
        raise ValueError(
            "Numerical input values cannot be empty."
        )
    return values


def preprocess_text(text: str | None) -> str:
    if not text:
        raise ValueError(
            "Text input cannot be empty."
        )
    return text.strip()