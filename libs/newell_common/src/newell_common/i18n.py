import json
from functools import lru_cache
from pathlib import Path

from newell_common.config import get_settings

_DEFAULT = "en"


@lru_cache
def _catalog(locale: str) -> dict[str, str]:
    root = Path(get_settings().locales_dir)
    path = root / f"{locale}.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def translate(key: str, locale: str = _DEFAULT) -> str:
    for loc in (locale, _DEFAULT):
        value = _catalog(loc).get(key)
        if value is not None:
            return value
    return key
