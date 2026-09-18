"use client";
import { cld } from "../lib/cld";
import "./site-header.css";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
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
  current_price?: number;
  images?: { url: string; media_type?: string }[];
};

type FilterOptions = {
  sizes: string[];
  colors: { name: string; hex: string }[];
  materials: { ru: string; tj: string }[];
  seasons: { ru: string; tj: string }[];
};

export function SiteHeader() {
  return (
    <Suspense fallback={null}>
      <SiteHeaderInner />
    </Suspense>
  );
}

function SiteHeaderInner() {
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

  const [favoritesCount, setFavoritesCount] = useState(0);
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
  const activeFilters = [minPrice, maxPrice, filterSize, filterColor, filterMaterial, filterSeason].filter(Boolean).length + [filterBrandOnly, filterInStock, filterOnSale].filter(Boolean).length;

  useEffect(() => {
    const open = () => setFiltersOpen(true);
    window.addEventListener("oina:open-filters", open);
    return () => window.removeEventListener("oina:open-filters", open);
  }, []);

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


  // счётчик избранного: гость — localStorage, вошедший — API
  useEffect(() => {
    const load = () => {
      if (!auth.token) {
        try {
          const ids = JSON.parse(localStorage.getItem("guest_favorites") || "[]");
          setFavoritesCount(Array.isArray(ids) ? ids.length : 0);
        } catch { setFavoritesCount(0); }
        return;
      }
      fetch(`${API_URL}/favorites/`, { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((res) => res.json())
        .then((data) => setFavoritesCount(Array.isArray(data) ? data.length : 0))
        .catch(() => setFavoritesCount(0));
    };
    load();
    const t = setTimeout(load, 800);
    window.addEventListener("focus", load);
    window.addEventListener("oina:favorites-changed", load);
    return () => { clearTimeout(t); window.removeEventListener("focus", load); window.removeEventListener("oina:favorites-changed", load); };
  }, [auth.token, pathname, searchParams]);

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
          <button className={`oh-burger${menuOpen ? " is-open" : ""}`} onClick={() => setMenuOpen((o) => !o)} aria-label={tr("Меню", "Меню")}>
            <span /><span />
          </button>

          <nav className="oh-nav">
            <span className={`oh-link${pathname === "/" && !selectedCategoryId ? " is-active" : ""}`} onClick={() => router.push("/")}>
              {tr("Главная", "Асосӣ")}
            </span>
          </nav>

          <img className="oh-logo" src="/logo.png" alt="Oina.tj" onClick={() => router.push("/")} />

          <div className="oh-actions">
            <span className="oh-action" onClick={() => setSearchOpen(true)} title={tr("Поиск", "Ҷустуҷӯ")}>
              <span className="oh-txt">{tr("Поиск", "Ҷустуҷӯ")}</span>
              <span className="oh-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 L21 21" strokeLinecap="round" /></svg>
              </span>
            </span>

            <span className="oh-action oh-hide-mobile" onClick={() => router.push("/favorites")} title={tr("Избранное", "Интихобҳо")}>
              <span className="oh-txt">{tr("Избранное", "Интихобҳо")} <span className="oh-count">({favoritesCount})</span></span>
              <span className="oh-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M12 20.5 C12 20.5 3.5 14.6 3.5 8.9 C3.5 6 5.7 4 8.3 4 C10 4 11.3 4.9 12 6 C12.7 4.9 14 4 15.7 4 C18.3 4 20.5 6 20.5 8.9 C20.5 14.6 12 20.5 12 20.5 Z" strokeLinejoin="round" /></svg>
                {favoritesCount > 0 && <span className="oh-badge">{favoritesCount}</span>}
              </span>
            </span>

            <span className="oh-action oh-hide-mobile" onClick={() => window.dispatchEvent(new CustomEvent("oina:open-bag", { detail: "cart" }))} title={tr("Корзина", "Сабад")}>
              <span className="oh-txt">{tr("Корзина", "Сабад")} <span className="oh-count">({cart.totalCount})</span></span>
              <span className="oh-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 8.5 H19 L18 21 H6 Z" strokeLinejoin="round" /><path d="M8.5 8.5 V7 C8.5 4.8 10 3.3 12 3.3 C14 3.3 15.5 4.8 15.5 7 V8.5" /></svg>
                {cart.totalCount > 0 && <span className="oh-badge">{cart.totalCount}</span>}
              </span>
            </span>

            <span className="oh-action oh-hide-mobile" onClick={() => router.push(auth.customer ? "/account" : "/?login=1")} title={auth.customer ? tr("Профиль", "Уток") : tr("Войти", "Даромадан")}>
              <span className="oh-txt oh-name">{auth.customer ? auth.customer.name || tr("Профиль", "Уток") : tr("Войти", "Даромадан")}</span>
              <span className="oh-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3"><circle cx="12" cy="8" r="4" /><path d="M4.5 21 C4.5 16.5 7.8 13.8 12 13.8 C16.2 13.8 19.5 16.5 19.5 21" strokeLinecap="round" /></svg>
              </span>
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
                      {thumb ? <img src={cld(thumb.url, 200)} alt={p.title_ru} /> : <span className="oh-suggest-noimg" />}
                      <span className="oh-suggest-title">{lang === "ru" ? p.title_ru : p.title_tj || p.title_ru}</span>
                      <span className="oh-suggest-price">{p.current_price ?? p.price} с.</span>
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
          <div className="oh-drawer oh-drawer--right flt" onClick={(e) => e.stopPropagation()}>
            <div className="bag-head">
              <span className="oh-label">{tr("Фильтры", "Филтрҳо")}{activeFilters > 0 && <span className="bag-count"> ({activeFilters})</span>}</span>
              <span className="oh-action" onClick={() => setFiltersOpen(false)}>{tr("Закрыть", "Пӯшидан")} ×</span>
            </div>

            <div className="flt-body">
              <div className="flt-sec">
                <div className="flt-label">{tr("Цена, смн", "Нарх, смн")}</div>
                <div className="flt-price">
                  <label className="ck-field">
                    <span className="ck-field-label">{tr("От", "Аз")}</span>
                    <input key={`min-${minPrice}`} type="number" inputMode="numeric" defaultValue={minPrice}
                      onBlur={(e) => e.target.value !== minPrice && goToCatalog({ min_price: e.target.value || null })}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
                  </label>
                  <span className="flt-dash">—</span>
                  <label className="ck-field">
                    <span className="ck-field-label">{tr("До", "То")}</span>
                    <input key={`max-${maxPrice}`} type="number" inputMode="numeric" defaultValue={maxPrice}
                      onBlur={(e) => e.target.value !== maxPrice && goToCatalog({ max_price: e.target.value || null })}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} />
                  </label>
                </div>
              </div>

              {filterOptions.sizes.length > 0 && (
                <div className="flt-sec">
                  <div className="flt-label">{tr("Размер", "Андоза")}{filterSize && <b> — {filterSize}</b>}</div>
                  <div className="flt-sizes">
                    {filterOptions.sizes.map((sz) => (
                      <button key={sz} className={`pd-size${filterSize === sz ? " is-active" : ""}`} onClick={() => goToCatalog({ size: filterSize === sz ? null : sz })}>{sz}</button>
                    ))}
                  </div>
                </div>
              )}

              {filterOptions.colors.length > 0 && (
                <div className="flt-sec">
                  <div className="flt-label">{tr("Цвет", "Ранг")}{filterColor && <b> — {filterColor}</b>}</div>
                  <div className="flt-colors">
                    {filterOptions.colors.map((c) => (
                      <button
                        key={c.name}
                        title={c.name}
                        className={`pd-color${filterColor === c.name ? " is-active" : ""}`}
                        style={{ background: c.hex }}
                        onClick={() => goToCatalog({ color: filterColor === c.name ? null : c.name })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {filterOptions.materials.length > 0 && (
                <div className="flt-sec">
                  <div className="flt-label">{tr("Материал", "Матоъ")}</div>
                  <div className="flt-chips">
                    {filterOptions.materials.map((m) => (
                      <button key={m.ru} className={`flt-chip${filterMaterial === m.ru ? " is-active" : ""}`} onClick={() => goToCatalog({ material: filterMaterial === m.ru ? null : m.ru })}>
                        {lang === "ru" ? m.ru : m.tj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filterOptions.seasons.length > 0 && (
                <div className="flt-sec">
                  <div className="flt-label">{tr("Сезон", "Мавсим")}</div>
                  <div className="flt-chips">
                    {filterOptions.seasons.map((se) => (
                      <button key={se.ru} className={`flt-chip${filterSeason === se.ru ? " is-active" : ""}`} onClick={() => goToCatalog({ season: filterSeason === se.ru ? null : se.ru })}>
                        {lang === "ru" ? se.ru : se.tj}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flt-sec">
                <div className="flt-label">{tr("Показать", "Нишон додан")}</div>
                {[
                  { on: filterInStock, key: "in_stock_only", label: tr("Только в наличии", "Танҳо мавҷуд") },
                  { on: filterOnSale, key: "on_sale_only", label: tr("Только со скидкой", "Танҳо бо тахфиф") },
                  { on: filterBrandOnly, key: "brand_only", label: tr("Только бренды", "Танҳо брендҳо") },
                ].map((o) => (
                  <button key={o.key} className={`flt-check${o.on ? " is-on" : ""}`} onClick={() => goToCatalog({ [o.key]: o.on ? null : "true" })}>
                    <span className="flt-box" />{o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="bag-foot">
              <button className="bag-checkout" onClick={() => setFiltersOpen(false)}>{tr("Показать товары", "Нишон додани молҳо")}</button>
              <div className="bag-links bag-links--center">
                <span className={`bag-link${activeFilters === 0 ? " bag-link--muted" : ""}`} onClick={resetFilters}>{tr("Сбросить все", "Ҳамаро тоза кардан")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="mm">
          <nav className="mm-main">
            <span className="mm-link" onClick={() => { setMenuOpen(false); router.push("/"); }}>{tr("Главная", "Асосӣ")}</span>
            {parents.map((parent) => {
              const children = categories.filter((c) => c.parent_id === parent.id);
              const expanded = mobileExpanded === parent.id;
              return (
                <div key={parent.id} className="mm-group">
                  <span
                    className={`mm-link${selectedCategoryId === parent.id ? " is-active" : ""}`}
                    onClick={() => {
                      if (children.length > 0) setMobileExpanded(expanded ? null : parent.id);
                      else goToCatalog({ category_id: String(parent.id) });
                    }}
                  >
                    {catName(parent)}
                    {children.length > 0 && <i>{expanded ? "\u2212" : "+"}</i>}
                  </span>
                  {expanded && (
                    <div className="mm-sub">
                      <span onClick={() => goToCatalog({ category_id: String(parent.id) })}>{tr("Все товары", "Ҳамаи молҳо")}</span>
                      {children.map((child) => (
                        <span key={child.id} className={selectedCategoryId === child.id ? "is-active" : ""} onClick={() => goToCatalog({ category_id: String(child.id) })}>
                          {catName(child)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="mm-rule" />

          <nav className="mm-small">
            <span onClick={() => { setMenuOpen(false); router.push("/favorites"); }}>{tr("Избранное", "Интихобҳо")} ({favoritesCount})</span>
            <span onClick={() => { setMenuOpen(false); router.push(auth.customer ? "/account" : "/?login=1"); }}>
              {auth.customer ? tr("Профиль", "Уток") : tr("Войти", "Даромадан")}
            </span>
            {auth.customer && <span onClick={() => { setMenuOpen(false); router.push("/orders"); }}>{tr("Мои заказы", "Фармоишҳои ман")}</span>}
            <span onClick={() => { setMenuOpen(false); router.push("/delivery"); }}>{tr("Доставка и оплата", "Расонидан ва пардохт")}</span>
            <span onClick={() => { setMenuOpen(false); router.push("/faq"); }}>{tr("Частые вопросы", "Саволҳои маъмул")}</span>
          </nav>

          <div className="mm-foot">
            <div className="mm-toggles">
              <span onClick={toggleLang}><b className={lang === "ru" ? "is-on" : ""}>RU</b> / <b className={lang === "tj" ? "is-on" : ""}>TJ</b></span>
              <span onClick={toggleTheme}>{theme === "dark" ? tr("Светлая тема", "Мавзӯи равшан") : tr("Тёмная тема", "Мавзӯи торик")}</span>
            </div>
            <div className="mm-social"><SocialLinks /></div>
          </div>
        </div>
      )}
    </>
  );
}
