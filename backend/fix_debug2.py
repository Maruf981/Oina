import io

path = "app/routers/telegram_auth.py"
with io.open(path, "r", encoding="utf-8", newline="") as f:
    content = f.read()
content = content.replace("\r\n", "\n")

old = '''import hashlib
import hmac
from urllib.parse import parse_qsl'''

new = '''import hashlib
import hmac
import sys
from urllib.parse import parse_qsl'''

if old not in content:
    print("NOT FOUND 1")
else:
    content = content.replace(old, new)
    print("OK 1")

old2 = '''    print(f"DEBUG bot_token_len={len(bot_token)} bot_token_repr={bot_token!r}")
    print(f"DEBUG calculated_hash={calculated_hash}")
    print(f"DEBUG received_hash={received_hash}")'''

new2 = '''    print(f"DEBUG bot_token_len={len(bot_token)} bot_token_repr={bot_token!r}", file=sys.stderr, flush=True)
    print(f"DEBUG calculated_hash={calculated_hash}", file=sys.stderr, flush=True)
    print(f"DEBUG received_hash={received_hash}", file=sys.stderr, flush=True)
    print(f"DEBUG data_check_string={data_check_string!r}", file=sys.stderr, flush=True)'''

if old2 not in content:
    print("NOT FOUND 2")
else:
    content = content.replace(old2, new2)
    print("OK 2")

content = content.replace("\n", "\r\n")
with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
print("Done")
