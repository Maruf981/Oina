"use client";
import "./site-header.css";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "./theme-context";
import { useLang } from "./lang-context";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";
import { useCategories } from "./categories-context";
import { SocialLinks } from "./social-links";

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const auth = useAuth();
  const cart = useCart();
  const { categories } = useCategories();
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);

  const headerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [overHero, setOverHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [history, setHistory] = useState<string[]>([]);
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

  // высота хедера -> CSS-переменная --header-h (для отступов страниц)
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--header-h", el.offsetHeight + "px");
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // прозрачный хедер, пока под ним полноэкранный блок .hero-full
  useEffect(() => {
    const update = () => {
      const hero = document.querySelector(".hero-full");
      const h = headerRef.current?.offsetHeight ?? 0;
      setOverHero(!!hero && hero.getBoundingClientRect().bottom > h);
    };
    update();
    const t1 = setTimeout(update, 400);
    const t2 = setTimeout(update, 1500);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, searchParams]);

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
    const lock = searchOpen || menuOpen || filtersOpen;
    document.body.style.overflow = lock ? "hidden" : "";
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setMenuOpen(false); setFiltersOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, menuOpen, filtersOpen]);

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
    const q = searchQuery.trim();
    if (!q || !searchOpen) {
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
  }, [searchQuery, searchOpen]);

  function saveToHistory(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 8);
      try { localStorage.setItem("oina_search_history", JSON.stringify(next)); } catch {}
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
    setSearchOpen(false);
    goToCatalog({ search: searchQuery.trim() || null });
  };

  const resetFilters = () => {
    goToCatalog({
      min_price: null, max_price: null, size: null, color: null,
      material: null, season: null, brand_only: null,
      in_stock_only: null, on_sale_only: null,
    });
  };

  const parents = categories.filter((c) => !c.parent_id);
  const catName = (c: { name: string; name_tj?: string | null }) => (lang === "tj" && c.name_tj ? c.name_tj : c.name);
  const clear = overHero && !searchOpen && !menuOpen;

  return (
    <>
      <header ref={headerRef} className={`oh${clear ? " oh--clear" : ""}`}>

        <div className="oh-main">
          <button className="oh-burger" onClick={() => setMenuOpen(true)} aria-label={tr("Меню", "Меню")}>
            <span /><span />
          </button>

          <nav className="oh-nav">
            <span className={`oh-link${pathname === "/" && !selectedCategoryId ? " is-active" : ""}`} onClick={() => router.push("/")}>
              {tr("Главная", "Асосӣ")}
            </span>
          </nav>

          <img className="oh-logo" src="/logo.png" alt="Oina.tj" onClick={() => router.push("/")} />

          <div className="oh-actions">
            <span className="oh-action" onClick={() => setSearchOpen(true)}>{tr("Поиск", "Ҷустуҷӯ")}</span>
            <span className="oh-action oh-cart" onClick={() => router.push("/cart")}>
              {tr("Корзина", "Сабад")} <span className="oh-count">({cart.totalCount})</span>
            </span>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="oh-search-backdrop" onClick={() => setSearchOpen(false)}>
          <div className="oh-search" onClick={(e) => e.stopPropagation()}>
            <div className="oh-search-row">
              <form className="oh-search-form" onSubmit={(e) => { e.preventDefault(); submitSearch(); }}>
                <input
                  ref={searchInputRef}
                  className="oh-search-input"
                  type="text"
                  autoComplete="off"
                  name="oina-site-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={tr("Что вы ищете?", "Шумо чӣ меҷӯед?")}
                />
              </form>
              <span className="oh-action" onClick={() => setFiltersOpen(true)}>{tr("Фильтры", "Филтрҳо")}</span>
              <span className="oh-action" onClick={() => setSearchOpen(false)}>{tr("Закрыть", "Пӯшидан")}</span>
            </div>

            <div className="oh-search-results">
              {searchQuery.trim() ? (
                suggestions.map((p) => {
                  const thumb = p.images?.find((img) => img.media_type !== "video");
                  return (
                    <div
                      key={p.id}
                      className="oh-suggest"
                      onClick={() => { saveToHistory(searchQuery); setSearchOpen(false); router.push(`/product/${p.id}`); }}
                    >
                      {thumb ? <img src={thumb.url} alt={p.title_ru} /> : <span className="oh-suggest-noimg" />}
                      <span className="oh-suggest-title">{lang === "ru" ? p.title_ru : p.title_tj || p.title_ru}</span>
                      <span className="oh-suggest-price">{p.price} с.</span>
                    </div>
                  );
                })
              ) : history.length > 0 ? (
                <>
                  <div className="oh-label">{tr("Недавние запросы", "Ҷустуҷӯҳои охирин")}</div>
                  <div className="oh-history">
                    {history.map((h) => (
                      <span key={h} onClick={() => { setSearchQuery(h); setSearchOpen(false); goToCatalog({ search: h }); }}>{h}</span>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {filtersOpen && (
        <div className="oh-drawer-backdrop" onClick={() => setFiltersOpen(false)}>
          <div className="oh-drawer oh-drawer--right filters-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="oh-drawer-head">
              <span className="oh-label">{tr("Фильтры", "Филтрҳо")}</span>
              <span className="oh-action" onClick={() => setFiltersOpen(false)}>{tr("Закрыть", "Пӯшидан")}</span>
            </div>
            <div className="oh-filters">
              <input type="number" placeholder={tr("Цена от", "Нарх аз")} defaultValue={minPrice}
                onBlur={(e) => goToCatalog({ min_price: e.target.value || null })} />
              <input type="number" placeholder={tr("Цена до", "Нарх то")} defaultValue={maxPrice}
                onBlur={(e) => goToCatalog({ max_price: e.target.value || null })} />
              <select value={filterSize} onChange={(e) => goToCatalog({ size: e.target.value || null })}>
                <option value="">{tr("Все размеры", "Ҳама андозаҳо")}</option>
                {filterOptions.sizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="oh-colors">
                {filterOptions.colors.map((c) => (
                  <span
                    key={c.name}
                    title={c.name}
                    className={filterColor === c.name ? "is-active" : ""}
                    style={{ background: c.hex }}
                    onClick={() => goToCatalog({ color: filterColor === c.name ? null : c.name })}
                  />
                ))}
              </div>
              <select value={filterMaterial} onChange={(e) => goToCatalog({ material: e.target.value || null })}>
                <option value="">{tr("Материал", "Матоъ")}</option>
                {filterOptions.materials.map((m) => <option key={m.ru} value={m.ru}>{lang === "ru" ? m.ru : m.tj}</option>)}
              </select>
              <select value={filterSeason} onChange={(e) => goToCatalog({ season: e.target.value || null })}>
                <option value="">{tr("Сезон", "Мавсим")}</option>
                {filterOptions.seasons.map((s) => <option key={s.ru} value={s.ru}>{lang === "ru" ? s.ru : s.tj}</option>)}
              </select>
              <label><input type="checkbox" checked={filterBrandOnly} onChange={(e) => goToCatalog({ brand_only: e.target.checked ? "true" : null })} />{tr("Только бренды", "Танҳо брендҳо")}</label>
              <label><input type="checkbox" checked={filterInStock} onChange={(e) => goToCatalog({ in_stock_only: e.target.checked ? "true" : null })} />{tr("Только в наличии", "Танҳо мавҷуд")}</label>
              <label><input type="checkbox" checked={filterOnSale} onChange={(e) => goToCatalog({ on_sale_only: e.target.checked ? "true" : null })} />{tr("Только со скидкой", "Танҳо бо тахфиф")}</label>
              <span className="oh-underline" onClick={resetFilters}>{tr("Сбросить", "Тоза кардан")}</span>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="oh-drawer-backdrop" onClick={() => setMenuOpen(false)}>
          <div className="oh-drawer oh-drawer--left" onClick={(e) => e.stopPropagation()}>
            <div className="oh-drawer-head">
              <img className="oh-logo oh-logo--drawer" src="/logo.png" alt="Oina.tj" />
              <span className="oh-action" onClick={() => setMenuOpen(false)}>{tr("Закрыть", "Пӯшидан")}</span>
            </div>
            <div className="oh-drawer-body">
              {parents.map((parent) => {
                const children = categories.filter((c) => c.parent_id === parent.id);
                const expanded = mobileExpanded === parent.id;
                return (
                  <div key={parent.id} className="oh-m-group">
                    <div
                      className="oh-m-cat"
                      onClick={() => {
                        if (children.length > 0) setMobileExpanded(expanded ? null : parent.id);
                        else goToCatalog({ category_id: String(parent.id) });
                      }}
                    >
                      <span>{catName(parent)}</span>
                      {children.length > 0 && <span className="oh-m-sign">{expanded ? "\u2212" : "+"}</span>}
                    </div>
                    {expanded && (
                      <div className="oh-m-children">
                        <span className="oh-m-all" onClick={() => goToCatalog({ category_id: String(parent.id) })}>{tr("Все товары", "Ҳамаи молҳо")}</span>
                        {children.map((child) => (
                          <span key={child.id} onClick={() => goToCatalog({ category_id: String(child.id) })}>{catName(child)}</span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="oh-drawer-foot">
              <span className="oh-action" onClick={() => router.push("/favorites")}>{tr("Избранное", "Интихобҳо")}</span>
              <span className="oh-action" onClick={() => router.push(auth.customer ? "/account" : "/?login=1")}>
                {auth.customer ? tr("Профиль", "Уток") : tr("Войти", "Даромадан")}
              </span>
              <div className="oh-drawer-toggles">
                <span className="oh-action" onClick={toggleLang}>{lang === "ru" ? "RU / tj" : "ru / TJ"}</span>
                <span className="oh-action" onClick={toggleTheme}>{theme === "dark" ? tr("Светлая тема", "Мавзӯи равшан") : tr("Тёмная тема", "Мавзӯи торик")}</span>
              </div>
              <SocialLinks />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
