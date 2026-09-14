import io
p = "src/app/home-client.tsx"
s = io.open(p, encoding="utf-8").read()
new = io.open("menu-footer.tsx", encoding="utf-8").read().rstrip("\n")

start = '            <div\n              style={{\n                flexShrink: 0,'
end = '\n          </div>\n        </div>\n      )}'
i = s.index(start)
j = s.index(end, i)
s = s[:i] + new + s[j:]
io.open(p, "w", encoding="utf-8").write(s)
print("ok: footer replaced")
