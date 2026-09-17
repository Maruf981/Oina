"use client";

import "../hero.css";
import "../product-card.css";
import "../cart/cart.css";
import "./favorites.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
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
  discount_percent: number | null;
  original_price: number | null;
  discount_from: string | null;
  discount_to: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
};
type FavoriteEntry = { id: number; product: Product };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function isDiscountActive(p: Product) {
  if (!p.discount_percent) return false;
  const now = new Date();
  if (p.discount_from && new Date(p.discount_from) > now) return false;
  if (p.discount_to && new Date(p.discount_to) < now) return false;
  return true;
}

function getRecommendedBadge(p: Product): { text: string; color: string } | null {
  if (isDiscountActive(p) && p.discount_percent) return { text: `-${p.discount_percent}%`, color: "#D64545" };
  if (p.is_new) return { text: "Новинка", color: "#3E8E5A" };
  if (p.is_featured) return { text: "Хорошая цена", color: "#3B6EA8" };
  return null;
}

export default function FavoritesPage() {
  const auth = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const { theme } = useTheme();
  const { lang } = useLang();

  const [loading, setLoading] = useState(true);

  const loadGuestFavorites = async () => {
    setLoading(true);
    const saved = localStorage.getItem("guest_favorites");
    let ids: number[] = [];
    if (saved) {
      try {
        ids = JSON.parse(saved);
      } catch {
        ids = [];
      }
    }
    try {
      const products = await Promise.all(
        ids.map((id) =>
          fetch(`${API_URL}/products/${id}`).then((res) => (res.ok ? res.json() : null))
        )
      );
      const entries: FavoriteEntry[] = products
        .filter((p): p is Product => p !== null)
        .map((p) => ({ id: p.id, product: p }));
      setFavorites(entries);
    } catch {
      setFavorites([]);
    }
    setLoading(false);
  };

  const load = () => {
    if (!auth.token) return;
    setLoading(true);
    fetch(`${API_URL}/favorites/`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setFavorites(data);
        setLoading(false);
      })
      .catch(() => {
        setFavorites([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (auth.token) {
      load();
    } else {
      loadGuestFavorites();
    }
  }, [auth.token]);

  const removeFavorite = async (productId: number) => {
    if (!auth.token) {
      const saved = localStorage.getItem("guest_favorites");
      let ids: number[] = [];
      if (saved) {
        try {
          ids = JSON.parse(saved);
        } catch {
          ids = [];
        }
      }
      ids = ids.filter((id) => id !== productId);
      localStorage.setItem("guest_favorites", JSON.stringify(ids));
      setFavorites((prev) => prev.filter((f) => f.product.id !== productId));
      window.dispatchEvent(new Event("oina:favorites-changed"));
      return;
    }
    await fetch(`${API_URL}/favorites/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setFavorites((prev) => prev.filter((f) => f.product.id !== productId));
    window.dispatchEvent(new Event("oina:favorites-changed"));
  };

  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const isVid = (img: { url: string; media_type?: string }) => img.media_type === "video" || /\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(img.url);

  return (
    <div data-theme={theme} className="fv-root">
      <SiteHeader />
      <div className="fv">
        <div className="sec-head fv-head">
          <span className="coll-rule" />
          <div className="ck-eyebrow">{tr("Ваш список", "Рӯйхати шумо")}</div>
          <h1 className="sec-title fv-title">{tr("Избранное", "Интихобҳо")}</h1>
          {!loading && favorites.length > 0 && (
            <span className="sec-count">
              {favorites.length} {tr("товаров", "мол")}
            </span>
          )}
        </div>

        {loading ? (
          <div className="pc-grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pc"><div className="pc-media fv-skeleton" /></div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="ck-empty">
            <p>{tr("В избранном пока ничего нет", "Айни ҳол интихоб нест")}</p>
            <p className="fv-empty-note">{tr("Нажмите ♡ на карточке товара, чтобы сохранить его здесь.", "Барои нигоҳ доштан ♡-ро пахш кунед.")}</p>
            <button className="ck-btn ck-btn--outline" onClick={() => router.push("/")}>{tr("Перейти в каталог", "Ба каталог")}</button>
          </div>
        ) : (
          <div className="pc-grid">
            {favorites.map(({ product: p }) => {
              const photo = p.images.find((img) => !isVid(img)) || p.images[0];
              const out = p.variants.every((v) => v.stock <= 0);
              const badge = out
                ? tr("Нет в наличии", "Мавҷуд нест")
                : isDiscountActive(p) && p.discount_percent
                ? `−${p.discount_percent}%`
                : p.is_new
                ? tr("Новинка", "Нав")
                : p.is_featured
                ? tr("Хорошая цена", "Нархи хуб")
                : null;
              const title = lang === "tj" && p.title_tj ? p.title_tj : p.title_ru;
              return (
                <div key={p.id} className="pc">
                  <div className="pc-media" onClick={() => router.push(`/product/${p.id}`)}>
                    {photo && (
                      <div className="pc-slides">
                        <div className="pc-slide is-active">
                          {isVid(photo) ? <video src={photo.url} muted loop autoPlay playsInline /> : <img src={photo.url} alt={title} loading="lazy" />}
                        </div>
                      </div>
                    )}
                    {badge && <span className="pc-badge">{badge}</span>}
                  </div>

                  <div className="pc-actions">
                    <button className="pc-icon is-on" aria-label={tr("Убрать из избранного", "Аз интихобҳо нест кардан")} title={tr("Убрать из избранного", "Аз интихобҳо нест кардан")} onClick={() => removeFavorite(p.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 20.5 C12 20.5 3.5 14.6 3.5 8.9 C3.5 6 5.7 4 8.3 4 C10 4 11.3 4.9 12 6 C12.7 4.9 14 4 15.7 4 C18.3 4 20.5 6 20.5 8.9 C20.5 14.6 12 20.5 12 20.5 Z" strokeLinejoin="round" /></svg>
                    </button>
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
