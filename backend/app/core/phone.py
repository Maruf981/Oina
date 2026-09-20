import re


def phone_core(phone: str | None) -> str:
    """Последние 9 цифр номера: '+992 900-12-34-56' -> '900123456'."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-9:] if len(digits) >= 9 else digits


def phone_variants(phone: str | None) -> list[str]:
    """Все форматы, в которых номер может лежать в базе."""
    raw = (phone or "").strip()
    core = phone_core(raw)
    v = {raw, core}
    if len(core) == 9:
        v |= {f"+992{core}", f"992{core}"}
    return [x for x in v if x]
