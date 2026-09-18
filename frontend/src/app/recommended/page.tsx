"use client";

import { cld } from "../../lib/cld";
import "../hero.css";
import "../product-card.css";
import "../cart/cart.css";
import "../favorites/favorites.css";
import "./recommended.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";

type ProductImage = { url: string; media_type?: string };
type ProductVariant = { id: number; size: string; color: string; stock: number };
type Product = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string | null;
  price: number;
  is_featured: boolean;
  is_new: boolean;
  is_brand?: boolean;
  discount_percent: number | null;
  original_price: number | null;
  discount_from: string | null;
  discount_to: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};
type Kind = "out" | "sale" | "new" | "good";
type Filter = "all" | Kind | "brand";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function isDiscountActive(p: Product) {
  if (!p.discount_percent) return false;
  const now = new Date();
  if (p.discount_from && new Date(p.discount_from) > now) return false;
  if (p.discount_to && new Date(p.discount_to) < now) return false;
  return true;
}

function getKind(p: Product): Kind | null {
  if (p.variants.every((v) => v.stock <= 0)) return "out";
  if (isDiscountActive(p) && p.discount_percent) return "sale";
  if (p.is_new) return "new";
  if (p.is_featured) return "good";
  return null;
}

export default function RecommendedPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { lang } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const isVid = (img: ProductImage) => img.media_type === "video" || /\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(img.url);

  const badgeText = (p: Product) => {
    const k = getKind(p);
    if (k === "out") return tr("Нет в наличии", "Мавҷуд нест");
    if (k === "sale") return `−${p.discount_percent}%`;
    if (k === "new") return tr("Новинка", "Нав");
    if (k === "good") return tr("Хорошая цена", "Нархи хуб");
    return null;
  };

  const tabs: { key: Filter; label: string }[] = [
    { key: "all", label: tr("Все", "Ҳама") },
    { key: "new", label: tr("Новинки", "Навҳо") },
    { key: "sale", label: tr("Со скидкой", "Бо тахфиф") },
    { key: "good", label: tr("Хорошая цена", "Нархи хуб") },
    { key: "out", label: tr("Нет в наличии", "Мавҷуд нест") },
    { key: "brand", label: tr("Бренды", "Брендҳо") },
  ];

  useEffect(() => {
    fetch(`${API_URL}/products/`)
      .then((res) => res.json())
      .then((data) => {
        const list: Product[] = Array.isArray(data) ? data : data.items ?? data.products ?? [];
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const badged = products.filter((p) => getKind(p) !== null);
  const items =
    filter === "all" ? badged
    : filter === "brand" ? products.filter((p) => p.is_brand)
    : badged.filter((p) => getKind(p) === filter);

  return (
    <div data-theme={theme} className="fv-root">
      <SiteHeader />
      <div className="fv">
        <div className="sec-head fv-head rc-head">
          <span className="coll-rule" />
          <div className="ck-eyebrow">{tr("Особые предложения", "Пешниҳодҳои махсус")}</div>
          <h1 className="sec-title fv-title">{tr("Рекомендации", "Тавсияҳо")}</h1>
          {!loading && (
            <span className="sec-count">
              {tr("Показано", "Нишон дода шуд")} {items.length} {tr("из", "аз")} {badged.length}
            </span>
          )}
        </div>

        <div className="rc-filter">
          {tabs.map((t) => (
            <button key={t.key} className={`rc-tab${filter === t.key ? " is-active" : ""}`} onClick={() => setFilter(t.key)}>
              {t.label}
            </button>
          ))}
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
          <div className="pc-grid">
            {items.map((p) => {
              const photo = p.images.find((img) => !isVid(img)) || p.images[0];
              const out = p.variants.every((v) => v.stock <= 0);
              const badge = badgeText(p);
              const title = lang === "tj" && p.title_tj ? p.title_tj : p.title_ru;
              return (
                <div key={p.id} className="pc">
                  <div className="pc-media" onClick={() => router.push(`/product/${p.id}`)}>
                    {photo && (
                      <div className="pc-slides">
                        <div className="pc-slide is-active">
                          {isVid(photo) ? <video src={photo.url} muted loop autoPlay playsInline /> : <img src={cld(photo.url, 800)} alt={title} loading="lazy" />}
                        </div>
                      </div>
                    )}
                    {badge && <span className="pc-badge">{badge}</span>}
                  </div>

                  <div className="pc-actions">
                    <span />
                    <button className="pc-icon" disabled={out} aria-label={tr("Выбрать размер", "Андоза интихоб кунед")} title={tr("Выбрать размер", "Андоза интихоб кунед")} onClick={() => router.push(`/product/${p.id}`)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M5 8.5 H19 L18 21 H6 Z" strokeLinejoin="round" /><path d="M8.5 8.5 V7 C8.5 4.8 10 3.3 12 3.3 C14 3.3 15.5 4.8 15.5 7 V8.5" /></svg>
                    </button>
                  </div>

                  <div className="pc-info" onClick={() => router.push(`/product/${p.id}`)}>
                    {p.catalog_number && <div className="pc-eyebrow">{tr("Арт.", "Арт.")} {p.catalog_number}</div>}
                    <div className="pc-title" title={title}>{title}</div>
                    <div className="pc-price">
                      {p.price} смн
                      {isDiscountActive(p) && <s>{Math.round(p.original_price ?? (p.price / (1 - (p.discount_percent as number) / 100)))} смн</s>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
