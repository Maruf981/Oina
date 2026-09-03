import io

path = "frontend/src/app/admin/page.tsx"
with io.open(path, "r", encoding="utf-8", newline="") as f:
    content = f.read()
content = content.replace("\r\n", "\n")

replacements = [
    (
        '    finance: "Финансы",\n    logout: "Выйти",',
        '    finance: "Финансы",\n    published: "Опубликованные",\n    drafts: "Черновики",\n    logout: "Выйти",'
    ),
    (
        '    finance: "Молия",\n    logout: "Баромадан",',
        '    finance: "Молия",\n    published: "Молҳои нашршуда",\n    drafts: "Лоиҳаҳо",\n    logout: "Баромадан",'
    ),
    (
        'const [tab, setTab] = useState<"products" | "categories" | "orders" | "warehouse" | "finance">("products");',
        'const [tab, setTab] = useState<"products" | "categories" | "orders" | "warehouse" | "finance" | "published" | "drafts">("products");'
    ),
    (
        '{(["products", "categories", "orders", "warehouse", "finance"] as const).map((tabName) => (',
        '{(["products", "categories", "orders", "warehouse", "finance", "published", "drafts"] as const).map((tabName) => ('
    ),
    (
        '        {tab === "products" && (\n          <ProductsTab\n            t={t}\n            products={products}',
        '        {(tab === "products" || tab === "published" || tab === "drafts") && (\n          <ProductsTab\n            t={t}\n            view={tab}\n            products={products}'
    ),
    (
        'function ProductsTab({ t, products, categories, suppliers, refreshSuppliers, selectedProduct, setSelectedProduct, creatingProduct, setCreatingProduct, authFetch, refreshProducts, token }: any) {',
        'function ProductsTab({ t, view, products, categories, suppliers, refreshSuppliers, selectedProduct, setSelectedProduct, creatingProduct, setCreatingProduct, authFetch, refreshProducts, token }: any) {'
    ),
    (
        '  return (\n    <div>\n      <button\n        onClick={() => setCreatingProduct(true)}\n        style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}\n      >\n        + {t.addProduct}\n      </button>\n\n      {productList.length === 0 && <p style={{ color: "var(--text-muted)" }}>{t.noProducts}</p>}\n\n      {draftProducts.length > 0 && (',
        '  return (\n    <div>\n      {view === "products" && (\n        <button\n          onClick={() => setCreatingProduct(true)}\n          style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}\n        >\n          + {t.addProduct}\n        </button>\n      )}\n\n      {view === "drafts" && draftProducts.length === 0 && <p style={{ color: "var(--text-muted)" }}>Черновиков пока нет</p>}\n\n      {view === "drafts" && draftProducts.length > 0 && ('
    ),
    (
        '      {publishedProducts.length > 0 && (\n        <div>\n          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16, color: "var(--text-muted)" }}>\n            Опубликовано ({publishedProducts.length})',
        '      {view === "published" && publishedProducts.length === 0 && <p style={{ color: "var(--text-muted)" }}>Опубликованных товаров пока нет</p>}\n\n      {view === "published" && publishedProducts.length > 0 && (\n        <div>\n          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16, color: "var(--text-muted)" }}>\n            Опубликовано ({publishedProducts.length})'
    ),
]

for old, new in replacements:
    if old not in content:
        print("NOT FOUND:\n", old[:200])
        print("---")
        continue
    count = content.count(old)
    if count > 1:
        print(f"WARNING: found {count} times, skipping to avoid ambiguous replace:\n", old[:200])
        continue
    content = content.replace(old, new)
    print("OK:", old[:60].replace("\n", "\\n"))

content = content.replace("\n", "\r\n")
with io.open(path, "w", encoding="utf-8", newline="") as f:
    f.write(content)

print("Done")
