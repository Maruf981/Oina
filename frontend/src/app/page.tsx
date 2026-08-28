
"use client";

import { useEffect, useState } from "react";
import { translations, Lang } from "./translations";

type Product = {
  id: number;
  title: string;
  catalog_number: string;
  price: number;
};


export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const t = translations[lang];

  useEffect(() => {
    fetch("http://127.0.0.1:8000/products/")
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem("lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  const toggleLang = () => {
    const next = lang === "ru" ? "tj" : "ru";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
  };

  return (
    <div data-theme={theme} style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
       <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 40px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            cursor: "pointer",
            width: 22,
          }}
        >
          <span style={{ height: 1, background: "var(--text)" }} />
          <span style={{ height: 1, background: "var(--text)" }} />
          <span style={{ height: 1, background: "var(--text)" }} />
        </div>
               <img
          src={theme === "dark" ? "/logo.png" : "/logo-light.png"}
          alt="Oina.tj"
          style={{ height: 72 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            onClick={toggleLang}
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-label)",
              fontSize: 12,
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            {lang === "ru" ? "RU" : "TJ"}
          </div>
          <div
            onClick={toggleTheme}
            style={{
              cursor: "pointer",
              width: 18,
              height: 18,
              borderRadius: "50%",
              border: "1px solid var(--text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Переключить тему"
          >
            <span style={{ fontSize: 10 }}>{theme === "dark" ? "☀" : "☾"}</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-label)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
          
            {t.cart} (0)
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div style={{ padding: "32px 40px", borderBottom: "1px solid var(--line)" }}>
          <div
            className="catalog-label"
            style={{ border: "none", padding: 0, marginBottom: 16 }}
          >

            {t.categories}
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t.women}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t.men}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t.kids}</span>
          </div>
        </div>
      )}

      <div
        style={{
          padding: "60px 40px",
          borderBottom: "1px solid var(--line)",
        }}
      >
<div className="catalog-label" style={{ border: "none", padding: 0, color: "var(--accent)" }}>
          {t.collection}
        </div>
        <h1 className="product-title" style={{ fontSize: 44, margin: "16px 0 24px" }}>
          {t.heroTitle}
        </h1>
        <p style={{ color: "var(--text-muted)", maxWidth: 380 }}>
          {t.heroSubtitle}
        </p>
      </div>

      <div style={{ padding: "0 40px 40px" }}>
        <h2 className="product-title" style={{ fontSize: 26, padding: "32px 0 24px" }}>
          {t.newArrivals}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 1,
            background: "var(--line)",
            border: "1px solid var(--line)",
          }}
        >
          {products.length === 0 && (
            <div style={{ padding: 40, background: "var(--bg)", color: "var(--text-muted)" }}>
               {t.noProducts}
            </div>
          )}
          {products.map((p) => (
            <div key={p.id} style={{ background: "var(--bg)", padding: 20 }}>
              <div
                style={{
                  aspectRatio: "3/4",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  marginBottom: 14,
                }}
              />
              <div className="product-title" style={{ fontSize: 17, marginBottom: 10 }}>
                {p.title}
              </div>
              <div className="catalog-label" style={{ display: "flex", justifyContent: "space-between" }}>
           <span>{t.catalogNumber} {p.catalog_number}</span>
                <span className="price">{p.price} смн</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}