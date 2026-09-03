import io

path = "app/routers/telegram_auth.py"
with io.open(path, "r", encoding="utf-8", newline="") as f:
    content = f.read()
content = content.replace("\r\n", "\n")

old = '''    print(f"DEBUG bot_token_len={len(bot_token)} bot_token_repr={bot_token!r}", file=sys.stderr, flush=True)
    print(f"DEBUG calculated_hash={calculated_hash}", file=sys.stderr, flush=True)
    print(f"DEBUG received_hash={received_hash}", file=sys.stderr, flush=True)
    print(f"DEBUG data_check_string={data_check_string!r}", file=sys.stderr, flush=True)
    if calculated_hash != received_hash:
        raise HTTPException(status_code=401, detail="Invalid Telegram signature")'''

new = '''    if calculated_hash != received_hash:
        raise HTTPException(
            status_code=401,
            detail=f"DEBUG token_len={len(bot_token)} calc={calculated_hash} recv={received_hash} check_str={data_check_string!r}",
        )'''

if old not in content:
    print("NOT FOUND")
else:
    content = content.replace(old, new)
    print("OK")

content = content.replace("\n", "\r\n")
with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)
print("Done")
