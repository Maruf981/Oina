import io

path = "app/routers/telegram_auth.py"
with io.open(path, "r", encoding="utf-8", newline="") as f:
    content = f.read()
content = content.replace("\r\n", "\n")

old = '''    import sys
    if calculated_hash != received_hash:
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")'''

new = '''    print(f"DEBUG bot_token_len={len(bot_token)} bot_token_repr={bot_token!r}")
    print(f"DEBUG calculated_hash={calculated_hash}")
    print(f"DEBUG received_hash={received_hash}")
    if calculated_hash != received_hash:
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")'''

if old not in content:
    print("NOT FOUND")
else:
    content = content.replace(old, new)
    print("OK")

content = content.replace("\n", "\r\n")
with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
print("Done")
