from deep_translator import GoogleTranslator


def translate_to_tj(text: str | None) -> str | None:
    if not text:
        return None
    try:
        return GoogleTranslator(source="ru", target="tg").translate(text)
    except Exception:
        return None