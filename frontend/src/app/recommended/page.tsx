"use client";

import { cld, cldVideo } from "../../lib/cld";
import "../hero.css";
import "../product-card.css";
import "../cart/cart.css";
import "../favorites/favorites.css";
import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";
import { useAuth } from "../auth-context";
import { useCart } from "../cart-context";
import { useCategories } from "../categories-context";

type Variant = { id: number; size: string; color: string; stock: number };
type ProductImage = { id?: number; url: string; sort_order?: number; media_type?: string };
type Product = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string;
  price: number;
  is_featured: boolean;
  is_new: boolean;
  is_brand: boolean;
  category?: { id: number; name: string } | null;
  avg_rating: number | null;
  review_count: number;
  discount_percent: number | null;
  original_price: number | null;
  discount_from: string | null;
  discount_to: string | null;
  current_price: number;
  discount_active: boolean;
  variants: Variant[];
  images: ProductImage[];
};
type Kind = "out" | "sale" | "brand" | "new" | "good";
type Filter = "all" | Kind;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function isDiscountActive(p: Product): boolean {
  return !!p.discount_active;
}

function getKind(p: Product): Kind | null {
  if (p.variants.every((v) => v.stock <= 0)) return "out";
  if (isDiscountActive(p) && p.discount_percent) return "sale";
  if (p.is_brand) return "brand";
  if (p.is_new) return "new";
  if (p.is_featured) return "good";
  return null;
}

export default function RecommendedPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { lang } = useLang();
  const auth = useAuth();
  const cart = useCart();
  const { categories } = useCategories();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [colors, setColors] = useState<{ name: string; hex: string }[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [quickAddProductId, setQuickAddProductId] = useState<number | null>(null);
  const [quickAddCtx, setQuickAddCtx] = useState("grid");
  const [quickAddSize, setQuickAddSize] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const localized = (ru: string, tj: string | null) => (lang === "tj" && tj ? tj : ru);

  useEffect(() => {
    fetch(`${API_URL}/products/`)
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data) ? data : data.items ?? data.products ?? []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
    fetch(`${API_URL}/products/filter-options`)
      .then((res) => res.json())
      .then((data) => setColors(data.colors ?? []))
      .catch(() => setColors([]));
  }, []);

  useEffect(() => {
    if (auth.token) {
      fetch(`${API_URL}/favorites/`, { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((res) => res.json())
        .then((favs: { product: { id: number } }[]) => setFavoriteIds(new Set(favs.map((f) => f.product.id))))
        .catch(() => {});
    } else {
      try { setFavoriteIds(new Set(JSON.parse(localStorage.getItem("guest_favorites") || "[]"))); } catch {}
    }
  }, [auth.token]);

  const toggleFavorite = async (productId: number) => {
    const isFav = favoriteIds.has(productId);
    const next = new Set(favoriteIds);
    if (isFav) next.delete(productId); else next.add(productId);

    if (!auth.token) {
      setFavoriteIds(next);
      try { localStorage.setItem("guest_favorites", JSON.stringify(Array.from(next))); } catch {}
      return;
    }
    try {
      const res = await fetch(`${API_URL}/favorites/${productId}`, {
        method: isFav ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) return;
      setFavoriteIds(next);
    } catch {}
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: tr("Все", "Ҳама") },
    { key: "new", label: tr("Новинки", "Навҳо") },
    { key: "sale", label: tr("Со скидкой", "Бо тахфиф") },
    { key: "good", label: tr("Хорошая цена", "Нархи хуб") },
    { key: "brand", label: tr("Бренды", "Брендҳо") },
  ];

  const inStockProducts = products.filter((p) => p.variants.some((v) => v.stock > 0));
  const badged = inStockProducts.filter((p) => getKind(p) !== null);
  const items =
    filter === "all" ? badged
    : filter === "brand" ? inStockProducts.filter((p) => p.is_brand)
    : badged.filter((p) => getKind(p) === filter);

  // --- карточка 1:1 с главной (home-client.tsx renderCard) ---
  const renderCard = (p: Product, ctx: string) => {
    const inStock = p.variants.filter((v) => v.stock > 0);
    const out = inStock.length === 0;
    const badge = out
      ? (lang === "ru" ? "Нет в наличии" : "Мавҷуд нест")
      : isDiscountActive(p) && p.discount_percent
      ? `−${p.discount_percent}%`
      : p.is_brand
      ? "Бренд"
      : p.is_new
      ? (lang === "ru" ? "Новинка" : "Нав")
      : p.is_featured
      ? (lang === "ru" ? "Хорошая цена" : "Нархи хуб")
      : null;
    const cat = p.category ? categories.find((c) => c.id === p.category!.id) : null;
    const catName = cat ? (lang === "tj" && cat.name_tj ? cat.name_tj : cat.name) : "";
    const eyebrow = p.is_brand ? (catName ? `Бренд · ${catName}` : "Бренд") : catName;
    const quickKey = `${ctx}-${p.id}`;
    const quickOpen = quickAddProductId === p.id && quickAddCtx === ctx;
    const addVariant = (v: Variant) => {
      cart.addItem({
        variantId: v.id,
        productId: p.id,
        title: localized(p.title_ru, p.title_tj),
        catalogNumber: p.catalog_number,
        price: p.current_price,
        size: v.size,
        color: v.color,
      }).then((res) => {
        setToastType(res.ok ? "success" : "error");
        setToastMessage(res.ok ? (lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд") : (res.error || (lang === "ru" ? "Не удалось добавить" : "Илова нашуд")));
        setTimeout(() => setToastMessage(null), 3000);
      });
    };
    const fillPct = `${(Math.max(0, Math.min(5, p.avg_rating ?? 0)) / 5) * 100}%`;
    const star = <svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17.3l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" /></svg>;
    return (
      <div key={quickKey} className="pc">
        <div className="pc-media" onClick={() => router.push(`/product/${p.id}`)}>
          <CardMedia images={p.images} alt={localized(p.title_ru, p.title_tj)} />
          {badge && <span className="pc-badge">{badge}</span>}
          {p.avg_rating && p.review_count > 0 ? (
            <span className="pc-rating" title={`${p.avg_rating.toFixed(1)} / 5 · ${p.review_count}`}>
              <span className="pc-stars">
                <span className="pc-stars-row pc-stars-base">{[0, 1, 2, 3, 4].map((i) => <span key={i}>{star}</span>)}</span>
                <span className="pc-stars-row pc-stars-fill" style={{ width: fillPct, "--pc-fill": fillPct } as CSSProperties}>{[0, 1, 2, 3, 4].map((i) => <span key={i}>{star}</span>)}</span>
              </span>
              <span className="pc-rating-num">{p.avg_rating.toFixed(1)} <span className="pc-rating-count">({p.review_count})</span></span>
            </span>
          ) : null}
          {quickOpen && (
            <div className="pc-quick" onClick={(e) => e.stopPropagation()}>
              {!quickAddSize ? (
                <>
                  <div className="pc-quick-label">{lang === "ru" ? "Выберите размер" : "Андозаро интихоб кунед"}</div>
                  <div className="pc-quick-row">
                    {Array.from(new Set(inStock.map((v) => v.size))).map((sz) => (
                      <span key={sz} className="pc-size" onClick={() => setQuickAddSize(sz)}>{sz}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="pc-quick-label">{lang === "ru" ? "Выберите цвет" : "Рангро интихоб кунед"}</div>
                  <div className="pc-quick-row">
                    {inStock.filter((v) => v.size === quickAddSize).map((v) => (
                      <span
                        key={v.id}
                        title={v.color}
                        className="pc-color"
                        style={{ background: colors.find((c) => c.name === v.color)?.hex || "#999999" }}
                        onClick={() => { addVariant(v); setQuickAddProductId(null); }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="pc-actions">
          <button
            className={`pc-icon${favoriteIds.has(p.id) ? " is-on" : ""}`}
            aria-label={lang === "ru" ? "В избранное" : "Ба интихобҳо"}
            onClick={() => {
              const wasFav = favoriteIds.has(p.id); setToastType("success"); setToastMessage((wasFav ? (lang === "ru" ? "Удалено из избранного" : "Аз интихобҳо хориҷ шуд") : (lang === "ru" ? "Добавлено в избранное" : "Ба интихобҳо илова шуд"))); setTimeout(() => setToastMessage(null), 2000); toggleFavorite(p.id);
              setTimeout(() => window.dispatchEvent(new Event("oina:favorites-changed")), 700);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 20.5 C12 20.5 3.5 14.6 3.5 8.9 C3.5 6 5.7 4 8.3 4 C10 4 11.3 4.9 12 6 C12.7 4.9 14 4 15.7 4 C18.3 4 20.5 6 20.5 8.9 C20.5 14.6 12 20.5 12 20.5 Z" strokeLinejoin="round" /></svg>
          </button>
          <button
            className="pc-icon"
            disabled={out}
            aria-label={lang === "ru" ? "В корзину" : "Ба сабад"}
            onClick={() => {
              if (out) return;
              if (inStock.length === 1) { addVariant(inStock[0]); return; }
              setQuickAddSize("");
              if (quickOpen) { setQuickAddProductId(null); return; }
              setQuickAddCtx(ctx);
              setQuickAddProductId(p.id);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 8.5 H19 L18 21 H6 Z" strokeLinejoin="round" /><path d="M8.5 8.5 V7 C8.5 4.8 10 3.3 12 3.3 C14 3.3 15.5 4.8 15.5 7 V8.5" /></svg>
          </button>
        </div>

        <div className="pc-info" onClick={() => router.push(`/product/${p.id}`)}>
          {eyebrow && <div className="pc-eyebrow">{eyebrow}</div>}
          <div className="pc-title" title={localized(p.title_ru, p.title_tj)}>{localized(p.title_ru, p.title_tj)}</div>
          <div className="pc-price">
            {p.current_price} смн
            {isDiscountActive(p) && (
              <s>{p.price} смн</s>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-theme={theme} className="fv-root">
      <SiteHeader />
      <div className="fv">
        <div className="sec-head fv-head">
          <span className="coll-rule" />
          <div className="ck-eyebrow">{tr("Особые предложения", "Пешниҳодҳои махсус")}</div>
          <h1 className="sec-title fv-title">{tr("Рекомендации", "Тавсияҳо")}</h1>
          {!loading && (
            <span className="sec-count">
              {tr("Показано", "Нишон дода шуд")} {items.length} {tr("из", "аз")} {badged.length}
            </span>
          )}
          <nav className="sec-sort">
            {tabs.map((t) => (
              <span key={t.key} className={`coll-item${filter === t.key ? " is-active" : ""}`} onClick={() => setFilter(t.key)}>
                {t.label}
              </span>
            ))}
          </nav>
        </div>

        {loading ? (
          <div className="pc-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="pc"><div className="pc-media fv-skeleton" /></div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="ck-empty">
            <p>{filter === "brand" ? tr("Брендовых товаров пока нет", "Ҳоло моли брендӣ нест") : tr("В этой категории пока нет товаров", "Дар ин бахш ҳоло мол нест")}</p>
            <button className="ck-btn ck-btn--outline" onClick={() => setFilter("all")}>{tr("Показать все", "Ҳамаро нишон додан")}</button>
          </div>
        ) : (
          <div className="pc-grid">{items.map((p) => renderCard(p, "grid"))}</div>
        )}
      </div>

      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: toastType === "error" ? "#E24B4A" : "var(--text)",
            color: toastType === "error" ? "#fff" : "var(--bg)",
            padding: "12px 24px",
            fontFamily: "var(--font-label)",
            fontSize: 13,
            zIndex: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// --- 1:1 с главной (home-client.tsx CardMedia) ---
function CardMedia({ images, alt }: { images: { url: string; media_type?: string }[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!hover || images.length <= 1) return;
    const timer = setInterval(() => setActive((i) => (i + 1) % images.length), 1600);
    return () => clearInterval(timer);
  }, [hover, images.length]);

  if (images.length === 0) return null;

  return (
    <div
      className="pc-slides"
      onMouseEnter={() => { setHover(true); if (images.length > 1) setActive(1); }}
      onMouseLeave={() => { setHover(false); setActive(0); }}
    >
      {images.map((img, i) => (
        <div key={img.url + i} className={`pc-slide${i === active ? " is-active" : ""}`}>
          {img.media_type === "video" ? (
            <video src={cldVideo(img.url)} muted loop playsInline autoPlay={i === active} />
          ) : (
            <img src={cld(img.url, 800)} alt={alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
          )}
        </div>
      ))}
    </div>
  );
}
