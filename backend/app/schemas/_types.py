from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer

# В БД время хранится без пояса (UTC). Отдаём с явным UTC, иначе браузер читает его как местное (+5 ч сдвиг).
UtcDateTime = Annotated[
    datetime,
    PlainSerializer(lambda d: (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat(), return_type=str),
]
