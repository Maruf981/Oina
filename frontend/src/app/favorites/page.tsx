"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";

type ProductImage = { url: string };
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

const DISCOUNT_BADGE_STEPS = [5, 10, 15, 20, 25, 30];
function getDiscountBadgeSrc(percent: number | null): string | null {
  if (!percent) return null;
  let closest = DISCOUNT_BADGE_STEPS[0];
  for (const step of DISCOUNT_BADGE_STEPS) {
    if (step <= percent) closest = step;
  }
  return `/badge-discount-${closest}.png`;
}

export default function FavoritesPage() {
  const auth = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const { theme } = useTheme();
  const { lang } = useLang();

  const load = () => {
    if (!auth.token) return;
    fetch(`${API_URL}/favorites/`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then(setFavorites)
      .catch(() => setFavorites([]));
  };

  useEffect(() => {
    if (!auth.token) {
      router.push("/");
      return;
    }
    load();
  }, [auth.token]);

  const removeFavorite = async (productId: number) => {
    if (!auth.token) return;
    await fetch(`${API_URL}/favorites/${productId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${auth.token}` },
    });
    setFavorites((prev) => prev.filter((f) => f.product.id !== productId));
  };

  if (!auth.customer) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <SiteHeader />
      <div className="favorites-container" style={{ maxWidth: 900, margin: "0 auto", padding: 40, paddingTop: 106 }}>
        <span
          onClick={() => router.push("/")}
          style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)" }}
        >
          {lang === "ru" ? "← Назад в каталог" : "← Ба қафо"}
        </span>

        <h1 className="product-title" style={{ fontSize: 28, margin: "24px 0 30px" }}>
          {lang === "ru" ? "Избранное" : "Интихобҳо"}
        </h1>

        {favorites.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            {lang === "ru" ? "Список избранного пуст" : "Айни ҳол интихоб нест"}
          </p>
        )}

        <div
          className="favorites-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 20,
          }}
        >
          {favorites.map(({ product: p }) => (
            <div key={p.id}>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "3/4",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  marginBottom: 10,
                }}
              >
                <div
                  onClick={() => router.push(`/product/${p.id}`)}
                  style={{
                    position: "absolute",
                    inset: 0,
                    cursor: "pointer",
                    backgroundImage: p.images[0] ? `url(${p.images[0].url})` : "none",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                  }}
                />
                {isDiscountActive(p) && getDiscountBadgeSrc(p.discount_percent) ? (
                  <img
                    src={getDiscountBadgeSrc(p.discount_percent)!}
                    alt="Скидка"
                    style={{ position: "absolute", top: -9, left: -9, width: 54, height: 54, objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : p.is_new ? (
                  <img
                    src="/badge-new.png"
                    alt="Новинка"
                    style={{ position: "absolute", top: -9, left: -9, width: 54, height: 54, objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : p.is_featured ? (
                  <img
                    src="/badge-featured.png"
                    alt="Хорошая цена"
                    style={{ position: "absolute", top: -9, left: -9, width: 54, height: 54, objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : null}

                <div
                  onClick={() => removeFavorite(p.id)}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 4,
                    width: 30,
                    height: 30,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg width="19" height="19" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}>
                    <path
                      d="M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3.3 8.2 3.3 C10 3.3 11.3 4.2 12 5.4 C12.7 4.2 14 3.3 15.8 3.3 C18.6 3.3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z"
                      fill="var(--accent)"
                      stroke="var(--accent)"
                      strokeWidth="1.4"
                    />
                  </svg>
                </div>
              </div>

              <div
                onClick={() => router.push(`/product/${p.id}`)}
                className="product-title"
                style={{ fontSize: 15, marginBottom: 4, cursor: "pointer" }}
              >
                {p.title_ru}
              </div>

              <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                {isDiscountActive(p) && (
                  <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: 12 }}>
                    {Math.round(p.price / (1 - (p.discount_percent as number) / 100))} смн
                  </span>
                )}
                <span className="price" style={{ color: "#4CAF50" }}>{p.price} смн</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
