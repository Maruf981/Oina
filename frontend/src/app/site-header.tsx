"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "./theme-context";
import { useLang } from "./lang-context";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";
import { useCategories } from "./categories-context";
import { CATEGORY_ICONS } from "./category-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Suggestion = {
  id: number;
  title_ru: string;
  title_tj?: string | null;
  price: number;
  images?: { url: string; media_type?: string }[];
};

type FilterOptions = {
  sizes: string[];
  colors: { name: string; hex: string }[];
  materials: { ru: string; tj: string }[];
  seasons: { ru: string; tj: string }[];
};

export function SiteHeader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const auth = useAuth();
  const cart = useCart();
  const { categories } = useCategories();

  const [isMobile, setIsMobile] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMegaMenu, setOpenMegaMenu] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ sizes: [], colors: [], materials: [], seasons: [] });

  const selectedCategoryId = searchParams.get("category_id") ? Number(searchParams.get("category_id")) : null;
  const minPrice = searchParams.get("min_price") || "";
  const maxPrice = searchParams.get("max_price") || "";
  const filterSize = searchParams.get("size") || "";
  const filterColor = searchParams.get("color") || "";
  const filterMaterial = searchParams.get("material") || "";
  const filterSeason = searchParams.get("season") || "";
  const filterBrandOnly = searchParams.get("brand_only") === "true";
  const filterInStock = searchParams.get("in_stock_only") === "true";
  const filterOnSale = searchParams.get("on_sale_only") === "true";

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oina_search_history");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("category_id", String(selectedCategoryId));
    fetch(`${API_URL}/products/filter-options?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data) setFilterOptions({
          sizes: data.sizes || [],
          colors: data.colors || [],
          materials: data.materials || [],
          seasons: data.seasons || [],
        });
      })
      .catch(() => setFilterOptions({ sizes: [], colors: [], materials: [], seasons: [] }));
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!auth.token) {
      const saved = localStorage.getItem("guest_favorites");
      if (saved) {
        try {
          const ids = JSON.parse(saved);
          setFavoritesCount(Array.isArray(ids) ? ids.length : 0);
        } catch {
          setFavoritesCount(0);
        }
      } else {
        setFavoritesCount(0);
      }
      return;
    }
    fetch(`${API_URL}/favorites/`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((res) => res.json())
      .then((data) => setFavoritesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setFavoritesCount(0));
  }, [auth.token]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`${API_URL}/products/?search=${encodeURIComponent(q)}`)
        .then((res) => res.json())
        .then((data) => setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []))
        .catch(() => setSuggestions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function saveToHistory(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 8);
      try {
        localStorage.setItem("oina_search_history", JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function goToCatalog(changes: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `/?${qs}` : "/");
  }

  const submitSearch = () => {
    saveToHistory(searchQuery);
    setShowSuggestions(false);
    goToCatalog({ search: searchQuery.trim() || null });
  };

  const resetFilters = () => {
    goToCatalog({
      min_price: null, max_price: null, size: null, color: null,
      material: null, season: null, brand_only: null,
      in_stock_only: null, on_sale_only: null,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    color: "var(--text)",
    fontFamily: "var(--font-body)",
    fontSize: 13,
    outline: "none",
  } as const;

  const parents = categories.filter((c) => !c.parent_id);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          borderBottom: "1px solid var(--header-border)",
          background: "var(--header-bg)",
          color: "var(--header-text)",
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            padding: "16px 40px",
            gap: 10,
            position: "relative",
          }}
        >
          {isMobile && (
            <div
              onClick={() => setMenuOpen(!menuOpen)}
              style={{ display: "flex", flexDirection: "column", gap: 6, cursor: "pointer", width: 28, flexShrink: 0 }}
            >
              <span style={{ height: 2, background: "var(--header-text)" }} />
              <span style={{ height: 2, background: "var(--header-text)" }} />
              <span style={{ height: 2, background: "var(--header-text)" }} />
            </div>
          )}

          <img
            className="header-logo"
            src="/logo.png"
            alt="Oina.tj"
            onClick={() => router.push("/")}
            style={{ height: "clamp(28px, 8vw, 48px)", cursor: "pointer", flexShrink: 0 }}
          />

          <div className="header-search-slot" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ width: "100%", position: "relative" }} ref={searchRef}>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <form
                  onSubmit={(e) => { e.preventDefault(); submitSearch(); }}
                  style={{ flex: 1 }}
                >
                  <input
                    type="text"
                    autoComplete="off"
                    name="oina-site-search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder={lang === "ru" ? "Поиск товаров..." : "Ҷустуҷӯи молҳо..."}
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--header-line)",
                      color: "var(--text)",
                      fontFamily: "var(--font-body)",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </form>
                <svg
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  style={{ cursor: "pointer", flexShrink: 0 }}
                >
                  <line x1="3" y1="6" x2="17" y2="6" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
                  <circle cx="12" cy="6" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
                  <line x1="3" y1="14" x2="17" y2="14" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
                  <circle cx="8" cy="14" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
                </svg>
              </div>

              {showSuggestions && (searchQuery.trim() ? suggestions.length > 0 : history.length > 0) && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "var(--bg)",
                    zIndex: 20,
                    maxHeight: 360,
                    overflowY: "auto",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  }}
                >
                  {searchQuery.trim()
                    ? suggestions.map((p) => (
                        <div
                          key={p.id}
                          onMouseDown={() => {
                            saveToHistory(searchQuery);
                            setShowSuggestions(false);
                            router.push(`/product/${p.id}`);
                          }}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--line)" }}
                        >
                          {(() => {
                            const thumb = p.images?.find((img) => img.media_type !== "video");
                            return thumb ? (
                              <img src={thumb.url} alt={p.title_ru} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} />
                            ) : null;
                          })()}
                          <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>
                            {lang === "ru" ? p.title_ru : p.title_tj || p.title_ru}
                          </span>
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.price} с.</span>
                        </div>
                      ))
                    : history.map((h) => (
                        <div
                          key={h}
                          onMouseDown={() => {
                            setSearchQuery(h);
                            setShowSuggestions(false);
                            goToCatalog({ search: h });
                          }}
                          style={{ padding: "10px 16px", cursor: "pointer", fontSize: 13, color: "var(--text-muted)", borderBottom: "1px solid var(--line)" }}
                        >
                          {h}
                        </div>
                      ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <span
              onClick={toggleLang}
              style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.05em", color: "var(--header-text)" }}
            >
              {lang === "ru" ? "RU" : "TJ"}
            </span>

            <span
              onClick={toggleTheme}
              style={{ cursor: "pointer", width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--header-text)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              title="Переключить тему"
            >
              <span style={{ fontSize: 10 }}>{theme === "dark" ? "☀" : "☾"}</span>
            </span>

            <span
              className="header-profile-icon"
              onClick={() => router.push("/favorites")}
              style={{ cursor: "pointer", position: "relative", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              title={lang === "ru" ? "Избранное" : "Интихобҳо"}
            >
              <svg width="21" height="21" viewBox="0 0 24 24">
                <path
                  d="M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3.3 8.2 3.3 C10 3.3 11.3 4.2 12 5.4 C12.7 4.2 14 3.3 15.8 3.3 C18.6 3.3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z"
                  fill="none"
                  stroke="var(--header-text)"
                  strokeWidth="1"
                />
              </svg>
              {favoritesCount > 0 && (
                <div style={{ position: "absolute", top: -4, right: -6, width: 15, height: 15, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--accent)", color: "var(--accent)", fontSize: 9, fontFamily: "var(--font-label)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {favoritesCount}
                </div>
              )}
            </span>

            <div
              className="header-cart-icon"
              onClick={() => router.push("/cart")}
              style={{ cursor: "pointer", position: "relative", width: 26, height: 26, flexShrink: 0 }}
            >
              <svg width="26" height="26" viewBox="0 0 30 30">
                <path d="M8 13 C8 13 8 11 10 11 L20 11 C22 11 22 13 22 13 L21 25 C21 25.5 20.5 26 20 26 L10 26 C9.5 26 9 25.5 9 25 Z" fill="none" stroke="var(--header-text)" strokeWidth="1" />
                <path d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11" fill="none" stroke="var(--header-text)" strokeWidth="1" />
                <line x1="12" y1="16" x2="12" y2="21" stroke="var(--header-text)" strokeWidth="0.6" />
                <line x1="15" y1="16" x2="15" y2="21" stroke="var(--header-text)" strokeWidth="0.6" />
                <line x1="18" y1="16" x2="18" y2="21" stroke="var(--header-text)" strokeWidth="0.6" />
              </svg>
              {cart.totalCount > 0 && (
                <div style={{ position: "absolute", top: -4, right: -6, width: 15, height: 15, borderRadius: "50%", background: "var(--bg)", border: "1px solid var(--accent)", color: "var(--accent)", fontSize: 9, fontFamily: "var(--font-label)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {cart.totalCount}
                </div>
              )}
            </div>

            <span
              className="header-profile-icon"
              onClick={() => router.push("/account")}
              style={{ cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
              title={auth.customer ? auth.customer.name || "Профиль" : lang === "ru" ? "Войти" : "Даромадан"}
            >
              {auth.customer?.avatar_url ? (
                <div style={{ width: 24, height: 24, borderRadius: "50%", backgroundImage: `url(${auth.customer.avatar_url})`, backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--line)" }} />
              ) : (
                <svg width="21" height="21" viewBox="0 0 20 20">
                  <circle cx="10" cy="7" r="3.2" fill="none" stroke="var(--header-text)" strokeWidth="1" />
                  <path d="M4 17 C4 13 6.5 11 10 11 C13.5 11 16 13 16 17" fill="none" stroke="var(--header-text)" strokeWidth="1" />
                </svg>
              )}
            </span>
          </div>
        </div>

        <div
          style={{
            borderTop: "1px solid var(--header-border)",
            display: "flex",
            justifyContent: "center",
            gap: 20,
            padding: "8px 12px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
            <span>🚚</span>{lang === "ru" ? "Доставка за 1 день" : "Дар 1 рӯз"}
          </span>
          <span className="trust-bar-secondary" style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
            <span>🔄</span>{lang === "ru" ? "Обмен 24ч" : "Иваз 24 соат"}
          </span>
          <span className="trust-bar-secondary" style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
            <span>↩️</span>{lang === "ru" ? "Бесплатный возврат" : "Баргардонии ройгон"}
          </span>
          <span style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
            <span>💳</span>{lang === "ru" ? "Оплата картой/QR" : "Пардохт бо корт/QR"}
          </span>
        </div>
      </nav>

      <div
        className="category-nav-desktop"
        style={{ display: "flex", gap: 28, padding: "0 40px", borderBottom: "1px solid var(--line)", position: "relative", maxWidth: 1200, margin: "0 auto" }}
      >
        {parents.map((parent) => {
          const children = categories.filter((c) => c.parent_id === parent.id);
          return (
            <div
              key={parent.id}
              style={{ position: "relative" }}
              onMouseEnter={() => setOpenMegaMenu(parent.id)}
              onMouseLeave={() => setOpenMegaMenu(null)}
            >
              <span
                onClick={() => goToCatalog({ category_id: String(parent.id) })}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "16px 0",
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  color: selectedCategoryId === parent.id ? "var(--accent)" : "var(--text)",
                  borderBottom: selectedCategoryId === parent.id ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {parent.icon && CATEGORY_ICONS[parent.icon]}
                <span>{lang === "tj" && parent.name_tj ? parent.name_tj : parent.name}</span>
              </span>
              {openMegaMenu === parent.id && children.length > 0 && (
                <div
                  style={{ position: "absolute", top: "100%", left: 0, background: "var(--bg)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)", padding: "16px 0", minWidth: 220, zIndex: 140 }}
                >
                  <span
                    onClick={() => { goToCatalog({ category_id: String(parent.id) }); setOpenMegaMenu(null); }}
                    style={{ display: "block", padding: "8px 24px", fontSize: 13, color: "var(--accent)", cursor: "pointer", fontFamily: "var(--font-label)", letterSpacing: "0.04em", textTransform: "uppercase" }}
                  >
                    {lang === "ru" ? "Все товары" : "Ҳамаи молҳо"}
                  </span>
                  {children.map((child) => (
                    <span
                      key={child.id}
                      onClick={() => { goToCatalog({ category_id: String(child.id) }); setOpenMegaMenu(null); }}
                      style={{ display: "block", padding: "8px 24px", fontSize: 14, color: selectedCategoryId === child.id ? "var(--accent)" : "var(--text)", cursor: "pointer" }}
                    >
                      {lang === "tj" && child.name_tj ? child.name_tj : child.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtersOpen && (
        <div
          onClick={() => setFiltersOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 160 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="filters-drawer"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(360px, 88vw)",
              background: "var(--bg)",
              borderLeft: "1px solid var(--line)",
              padding: "20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 14, letterSpacing: "0.04em", color: "var(--text)" }}>
                {lang === "ru" ? "Фильтры" : "Филтрҳо"}
              </span>
              <span onClick={() => setFiltersOpen(false)} style={{ cursor: "pointer", fontSize: 22, lineHeight: 1, color: "var(--text-muted)" }}>
                ×
              </span>
            </div>

            <input
              type="number"
              placeholder={lang === "ru" ? "Цена от" : "Нарх аз"}
              defaultValue={minPrice}
              onBlur={(e) => goToCatalog({ min_price: e.target.value || null })}
              style={inputStyle}
            />
            <input
              type="number"
              placeholder={lang === "ru" ? "Цена до" : "Нарх то"}
              defaultValue={maxPrice}
              onBlur={(e) => goToCatalog({ max_price: e.target.value || null })}
              style={inputStyle}
            />
            <select value={filterSize} onChange={(e) => goToCatalog({ size: e.target.value || null })} style={inputStyle}>
              <option value="">{lang === "ru" ? "Все размеры" : "Ҳама андозаҳо"}</option>
              {filterOptions.sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {filterOptions.colors.map((c) => (
                <span
                  key={c.name}
                  onClick={() => goToCatalog({ color: filterColor === c.name ? null : c.name })}
                  title={c.name}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: c.hex,
                    cursor: "pointer",
                    display: "inline-block",
                    boxShadow: filterColor === c.name ? "0 0 0 2px var(--accent)" : "0 0 0 1px var(--line)",
                  }}
                />
              ))}
            </div>

            <select value={filterMaterial} onChange={(e) => goToCatalog({ material: e.target.value || null })} style={inputStyle}>
              <option value="">{lang === "ru" ? "Материал" : "Матоъ"}</option>
              {filterOptions.materials.map((m) => (
                <option key={m.ru} value={m.ru}>{lang === "ru" ? m.ru : m.tj}</option>
              ))}
            </select>

            <select value={filterSeason} onChange={(e) => goToCatalog({ season: e.target.value || null })} style={inputStyle}>
              <option value="">{lang === "ru" ? "Сезон" : "Мавсим"}</option>
              {filterOptions.seasons.map((s) => (
                <option key={s.ru} value={s.ru}>{lang === "ru" ? s.ru : s.tj}</option>
              ))}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={filterBrandOnly} onChange={(e) => goToCatalog({ brand_only: e.target.checked ? "true" : null })} />
              {lang === "ru" ? "Только бренды" : "Танҳо брендҳо"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={filterInStock} onChange={(e) => goToCatalog({ in_stock_only: e.target.checked ? "true" : null })} />
              {lang === "ru" ? "Только в наличии" : "Танҳо мавҷуд"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input type="checkbox" checked={filterOnSale} onChange={(e) => goToCatalog({ on_sale_only: e.target.checked ? "true" : null })} />
              {lang === "ru" ? "Только со скидкой" : "Танҳо бо тахфиф"}
            </label>

            <span
              onClick={resetFilters}
              style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 12, color: "var(--text-muted)", textDecoration: "underline", alignSelf: "flex-start" }}
            >
              {lang === "ru" ? "Сбросить" : "Тоза кардан"}
            </span>
          </div>
        </div>
      )}

      {isMobile && menuOpen && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 150 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 280,
              maxWidth: "80vw",
              background: "var(--menu-panel-bg)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderTopRightRadius: 16,
              borderBottomRightRadius: 16,
            }}
          >
            <div
              style={{
                background: "var(--header-bg)",
                color: "var(--header-text)",
                padding: "32px 20px",
                minHeight: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--header-border)",
                borderTopRightRadius: 16,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em" }}>
                {lang === "ru" ? "Категории" : "Категорияҳо"}
              </span>
              <span onClick={() => setMenuOpen(false)} style={{ cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px" }}>
                ✕
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
              {parents.map((parent) => {
                const children = categories.filter((c) => c.parent_id === parent.id);
                const isExpanded = openMegaMenu === parent.id;
                return (
                  <div key={parent.id}>
                    <span
                      onClick={() => {
                        if (children.length > 0) {
                          setOpenMegaMenu(isExpanded ? null : parent.id);
                        } else {
                          goToCatalog({ category_id: String(parent.id) });
                          setMenuOpen(false);
                        }
                      }}
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        cursor: "pointer",
                        padding: "16px 24px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: selectedCategoryId === parent.id ? "var(--bg)" : "transparent",
                        borderBottom: "1px solid var(--line)",
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                        {parent.icon && CATEGORY_ICONS[parent.icon]}
                        <span>{lang === "tj" && parent.name_tj ? parent.name_tj : parent.name}</span>
                      </span>
                      {children.length > 0 && (
                        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{isExpanded ? "\u2212" : "+"}</span>
                      )}
                    </span>
                    {isExpanded && (
                      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)" }}>
                        <span
                          onClick={() => { goToCatalog({ category_id: String(parent.id) }); setMenuOpen(false); }}
                          style={{ fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", padding: "12px 24px 12px 44px", cursor: "pointer", color: "var(--accent)" }}
                        >
                          {lang === "ru" ? "Все товары" : "Ҳамаи молҳо"}
                        </span>
                        {children.map((child) => (
                          <span
                            key={child.id}
                            onClick={() => { goToCatalog({ category_id: String(child.id) }); setMenuOpen(false); }}
                            style={{ fontSize: 15, padding: "12px 24px 12px 44px", cursor: "pointer", color: selectedCategoryId === child.id ? "var(--accent)" : "var(--text)", borderBottom: "1px solid var(--line)" }}
                          >
                            {lang === "tj" && child.name_tj ? child.name_tj : child.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--line)" }}>
              {auth.customer ? (
                <span
                  onClick={() => { setMenuOpen(false); router.push("/account"); }}
                  style={{ fontSize: 14, color: "var(--text)", cursor: "pointer" }}
                >
                  {auth.customer.name || (lang === "ru" ? "Профиль" : "Уток")}
                </span>
              ) : (
                <span
                  onClick={() => { setMenuOpen(false); router.push("/?login=1"); }}
                  style={{ fontSize: 14, color: "var(--accent)", cursor: "pointer" }}
                >
                  {lang === "ru" ? "Войти" : "Даромадан"}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
