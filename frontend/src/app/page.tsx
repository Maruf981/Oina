"use client";

import { useEffect, useState } from "react";
import { translations, Lang } from "./translations";
import { useCart } from "./cart-context";
import { useAuth } from "./auth-context";
import { Footer } from "./footer";
import { useRouter } from "next/navigation";

type Variant = {
  id: number;
  size: string;
  color: string;
  stock: number;
};

type ProductImage = {
  id: number;
  url: string;
  sort_order: number;
};

type Product = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string;
  price: number;
  material_ru: string | null;
  material_tj: string | null;
  country_of_origin_ru: string | null;
  country_of_origin_tj: string | null;
  care_instructions_ru: string | null;
  care_instructions_tj: string | null;
  description_ru: string | null;
  description_tj: string | null;
  is_featured: boolean;
  is_new: boolean;
  is_brand: boolean;
  avg_rating: number | null;
  review_count: number;
  discount_percent: number | null;
  discount_from: string | null;
  discount_to: string | null;
  variants: Variant[];
  images: ProductImage[];
};

function isDiscountActive(p: Product): boolean {
  if (!p.discount_percent) return false;
  const now = new Date();
  if (p.discount_from && new Date(p.discount_from) > now) return false;
  if (p.discount_to && new Date(p.discount_to) < now) return false;
  return true;
}

const DISCOUNT_BADGE_STEPS = [5, 10, 15, 20, 25, 30, 40, 50];

function getDiscountBadgeSrc(percent: number | null): string | null {
  if (!percent) return null;
  let closest = DISCOUNT_BADGE_STEPS[0];
  for (const step of DISCOUNT_BADGE_STEPS) {
    if (step <= percent) closest = step;
  }
  return `/badge-discount-${closest}.png`;
}

function StarRating({ avgRating, reviewCount }: { avgRating: number | null; reviewCount: number }) {
  if (!avgRating || reviewCount === 0) return null;
  const rounded = Math.round(avgRating * 2) / 2;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
      <div style={{ display: "flex", gap: 1 }}>
        {[1, 2, 3, 4, 5].map((n) => {
          const fill = rounded >= n ? 1 : rounded >= n - 0.5 ? 0.5 : 0;
          return (
            <svg key={n} width="13" height="13" viewBox="0 0 24 24">
              <defs>
                <linearGradient id={`star-fill-${n}-${avgRating}`}>
                  <stop offset={`${fill * 100}%`} stopColor="var(--accent)" />
                  <stop offset={`${fill * 100}%`} stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.7 7.1-.6z"
                fill={`url(#star-fill-${n}-${avgRating})`}
                stroke="var(--accent)"
                strokeWidth="1"
              />
            </svg>
          );
        })}
      </div>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
        {avgRating.toFixed(1)} ({reviewCount})
      </span>
    </div>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<Record<number, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterColor, setFilterColor] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "form" | "payment" | "done">("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card">("qr");
  const t = translations[lang];
  const cart = useCart();
  const auth = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("login") === "1") {
      setAuthOpen(true);
    }
  }, []);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const localized = (ru: string, tj: string | null) => (lang === "tj" && tj ? tj : ru);

  useEffect(() => {
    if (!auth.token) {
      setFavoriteIds(new Set());
      return;
    }
    fetch(`${API_URL}/favorites/`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((favs: { product: { id: number } }[]) => {
        setFavoriteIds(new Set(favs.map((f) => f.product.id)));
      })
      .catch(() => setFavoriteIds(new Set()));
  }, [auth.token]);

  const toggleFavorite = async (productId: number) => {
    if (!auth.token) {
      setAuthOpen(true);
      return;
    }
    const isFav = favoriteIds.has(productId);
    const method = isFav ? "DELETE" : "POST";
    try {
      const res = await fetch(`${API_URL}/favorites/${productId}`, {
        method,
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) return;
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });
    } catch {
      // network error, ignore
    }
  };

    const handleAuthSubmit = async () => {
    setAuthError("");
    try {
      if (authMode === "login") {
        await auth.login(authPhone, authPassword);
      } else {
        await auth.register(authName, authPhone, authPassword);
      }
      setAuthOpen(false);
      setAuthName("");
      setAuthPhone("");
      setAuthPassword("");
    } catch {
      setAuthError(lang === "ru" ? "Неверный телефон или пароль" : "Телефон ё парол нодуруст");
    }
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const res = await fetch(`${API_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          comment: orderComment,
          payment_method: paymentMethod,
          items: cart.items.map((item) => ({
            product_variant_id: item.variantId,
            quantity: item.qty,
          })),
        }),
      });
      if (!res.ok) throw new Error("Order failed");
      const order = await res.json();
      setOrderNumber(order.id);
      setCheckoutStep("payment");
    } catch {
      alert(lang === "ru" ? "Ошибка оформления заказа" : "Хатогӣ ҳангоми фармоиш");
    } finally {
      setPlacing(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    const variantId = selectedSizes[product.id] ?? product.variants[0]?.id;
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;
    cart.addItem({
      variantId: variant.id,
      productId: product.id,
      title: localized(product.title_ru, product.title_tj),
      catalogNumber: product.catalog_number,
      price: product.price,
      size: variant.size,
      color: variant.color,
    });
    setToastMessage(lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд");
    setTimeout(() => setToastMessage(null), 2000);
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (filterSize) params.set("size", filterSize);
    if (filterColor) params.set("color", filterColor);

      fetch(`${API_URL}/products/?${params.toString()}`)
      .then((res) => res.json())
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [searchQuery, minPrice, maxPrice, filterSize, filterColor]);

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
    <div data-theme={theme} style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh", paddingTop: 90 }}>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
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
            padding: "16px 20px",
            gap: 10,
          }}
        >
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            width: 28,
            flexShrink: 0,
          }}
        >
          <span style={{ height: 2, background: "var(--text)" }} />
          <span style={{ height: 2, background: "var(--text)" }} />
          <span style={{ height: 2, background: "var(--text)" }} />
        </div>

        <img
          src={theme === "dark" ? "/logo.png" : "/logo-light.png"}
          alt="Oina.tj"
          style={{ height: "clamp(28px, 8vw, 48px)", flexShrink: 1, minWidth: 0 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span
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
          </span>

          <span
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
              flexShrink: 0,
            }}
            title="Переключить тему"
          >
            <span style={{ fontSize: 10 }}>{theme === "dark" ? "☀" : "☾"}</span>
          </span>

          <span
            className="header-profile-icon"
            onClick={() => (auth.customer ? router.push("/favorites") : setAuthOpen(true))}
            style={{ cursor: "pointer", position: "relative", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            title={lang === "ru" ? "Избранное" : "Интихобҳо"}
          >
            <svg width="21" height="21" viewBox="0 0 24 24">
              <path
                d="M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3.3 8.2 3.3 C10 3.3 11.3 4.2 12 5.4 C12.7 4.2 14 3.3 15.8 3.3 C18.6 3.3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1"
              />
            </svg>
            {favoriteIds.size > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  background: "var(--bg)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: 9,
                  fontFamily: "var(--font-label)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {favoriteIds.size}
              </div>
            )}
          </span>

          <div
            onClick={() => setCartOpen(true)}
            style={{ cursor: "pointer", position: "relative", width: 26, height: 26, flexShrink: 0 }}
          >
            <svg width="26" height="26" viewBox="0 0 30 30">
              <path
                d="M8 13 C8 13 8 11 10 11 L20 11 C22 11 22 13 22 13 L21 25 C21 25.5 20.5 26 20 26 L10 26 C9.5 26 9 25.5 9 25 Z"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1"
              />
              <path
                d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1"
              />
              <line x1="12" y1="16" x2="12" y2="21" stroke="var(--text)" strokeWidth="0.6" />
              <line x1="15" y1="16" x2="15" y2="21" stroke="var(--text)" strokeWidth="0.6" />
              <line x1="18" y1="16" x2="18" y2="21" stroke="var(--text)" strokeWidth="0.6" />
            </svg>
            {cart.totalCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
                  width: 15,
                  height: 15,
                  borderRadius: "50%",
                  background: "var(--bg)",
                  border: "1px solid var(--accent)",
                  color: "var(--accent)",
                  fontSize: 9,
                  fontFamily: "var(--font-label)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {cart.totalCount}
              </div>
            )}
          </div>

          <span
            className="header-profile-icon"
            onClick={() => (auth.customer ? router.push("/account") : setAuthOpen(true))}
            style={{ cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            title={auth.customer ? auth.customer.name || "Профиль" : lang === "ru" ? "Войти" : "Даромадан"}
          >
            {auth.customer?.avatar_url ? (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundImage: `url(${auth.customer.avatar_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: "1px solid var(--line)",
                }}
              />
            ) : (
              <svg width="21" height="21" viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="3.2" fill="none" stroke="var(--text-muted)" strokeWidth="1" />
                <path d="M4 17 C4 13 6.5 11 10 11 C13.5 11 16 13 16 17" fill="none" stroke="var(--text-muted)" strokeWidth="1" />
              </svg>
            )}
          </span>
        </div>
        </div>
      </nav>

      <div style={{ padding: "16px 40px", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === "ru" ? "Поиск товаров..." : "Ҷустуҷӯи молҳо..."}
            style={{
              flex: 1,
              padding: "10px 0",
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--line)",
              color: "var(--text)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              outline: "none",
            }}
          />
          <svg
            onClick={() => setFiltersOpen(!filtersOpen)}
            width="20"
            height="20"
            viewBox="0 0 20 20"
            style={{ cursor: "pointer", flexShrink: 0 }}
          >
            <line x1="3" y1="6" x2="17" y2="6" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
            <circle cx="12" cy="6" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
            <line x1="3" y1="14" x2="17" y2="14" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
            <circle cx="8" cy="14" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
          </svg>
        </div>

        {filtersOpen && (
          <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
            <input
              type="number"
              placeholder={lang === "ru" ? "Цена от" : "Нарх аз"}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              style={{
                width: 120,
                padding: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
            <input
              type="number"
              placeholder={lang === "ru" ? "Цена до" : "Нарх то"}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              style={{
                width: 120,
                padding: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              style={{
                padding: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: 13,
              }}
            >
              <option value="">{lang === "ru" ? "Все размеры" : "Ҳама андозаҳо"}</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
            </select>
            <input
              type="text"
              placeholder={lang === "ru" ? "Цвет" : "Ранг"}
              value={filterColor}
              onChange={(e) => setFilterColor(e.target.value)}
              style={{
                width: 140,
                padding: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
            <span
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setFilterSize("");
                setFilterColor("");
              }}
              style={{
                cursor: "pointer",
                fontFamily: "var(--font-label)",
                fontSize: 12,
                color: "var(--text-muted)",
                alignSelf: "center",
              }}
            >
              {lang === "ru" ? "Сбросить" : "Тоза кардан"}
            </span>
          </div>
        )}
      </div>

      {menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 150,
          }}
        >
          <div
            onMouseLeave={() => setMenuOpen(false)}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 280,
              maxWidth: "80vw",
              background: "var(--menu-panel-bg)",
              padding: "24px 0",
              display: "flex",
              flexDirection: "column",
              borderTopRightRadius: 16,
              borderBottomRightRadius: 16,
            }}
          >
            <div style={{ marginBottom: 30, padding: "0 24px" }}>
              <span
                className="catalog-label"
                style={{ border: "none", padding: 0, fontSize: 18, color: "var(--text)" }}
              >
                {t.categories}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {(["women", "men", "kids"] as const).map((key) => {
                const isActive = activeCategory === key || hoveredCategory === key;
                return (
                  <span
                    key={key}
                    onClick={() => setActiveCategory(key)}
                    onMouseEnter={() => setHoveredCategory(key)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 20,
                      cursor: "pointer",
                      padding: "16px 24px",
                      background: isActive ? "var(--bg)" : "transparent",
                      borderBottom: "1px solid var(--line)",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {t[key]}
                  </span>
                );
              })}
            </div>
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

        <div className="catalog-container" style={{ padding: "0 40px 40px" }}>
        <h2 className="product-title" style={{ fontSize: 26, padding: "32px 0 24px" }}>
          {t.newArrivals}
        </h2>
        <div
          className="products-grid"
          style={{
            display: "grid",
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
                  position: "relative",
                  aspectRatio: "3/4",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  marginBottom: 14,
                }}
              >
                <AutoSlideImage images={p.images} onClick={() => router.push(`/product/${p.id}`)} />
                {isDiscountActive(p) && getDiscountBadgeSrc(p.discount_percent) ? (
                  <img
                    src={getDiscountBadgeSrc(p.discount_percent)!}
                    alt="Скидка"
                    style={{ position: "absolute", top: -9, left: -9, width: 64, height: 64, objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : p.is_new ? (
                  <img
                    src="/badge-new.png"
                    alt="Новинка"
                    style={{ position: "absolute", top: -9, left: -9, width: 64, height: 64, objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : p.is_featured ? (
                  <img
                    src="/badge-featured.png"
                    alt="Хорошая цена"
                    style={{ position: "absolute", top: -9, left: -9, width: 64, height: 64, objectFit: "contain", pointerEvents: "none" }}
                  />
                ) : null}
                {p.is_brand && (
                  <img
                    src="/badge-brand.png"
                    alt="Бренд"
                    style={{ position: "absolute", top: -42, left: "50%", transform: "translateX(-50%)", width: 108, height: 108, objectFit: "contain", pointerEvents: "none" }}
                  />
                )}

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(p.id);
                  }}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 4,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                  >
                    <path
                      d="M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3.3 8.2 3.3 C10 3.3 11.3 4.2 12 5.4 C12.7 4.2 14 3.3 15.8 3.3 C18.6 3.3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z"
                      fill={favoriteIds.has(p.id) ? "var(--accent)" : "none"}
                      stroke="var(--accent)"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p.variants.length > 0) router.push(`/product/${p.id}`);
                  }}
                  style={{
                    position: "absolute",
                    top: 32,
                    right: 4,
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: p.variants.length === 0 ? "not-allowed" : "pointer",
                    opacity: p.variants.length === 0 ? 0.4 : 1,
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 30 30"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
                  >
                    <path
                      d="M8 13 C8 13 8 11 10 11 L20 11 C22 11 22 13 22 13 L21 25 C21 25.5 20.5 26 20 26 L10 26 C9.5 26 9 25.5 9 25 Z"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.1"
                    />
                    <path
                      d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.1"
                    />
                    <line x1="12" y1="16" x2="12" y2="21" stroke="var(--accent)" strokeWidth="0.7" />
                    <line x1="15" y1="16" x2="15" y2="21" stroke="var(--accent)" strokeWidth="0.7" />
                    <line x1="18" y1="16" x2="18" y2="21" stroke="var(--accent)" strokeWidth="0.7" />
                  </svg>
                </div>
              </div>
              <div
                onClick={() => router.push(`/product/${p.id}`)}
                className="product-title"
                style={{ fontSize: 17, marginBottom: 4, cursor: "pointer" }}
              >
                {localized(p.title_ru, p.title_tj)}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-label)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: p.variants.some((v) => v.stock > 0) ? "#4CAF50" : "#E24B4A",
                  marginBottom: 8,
                }}
              >
                {p.variants.some((v) => v.stock > 0)
                  ? (lang === "ru" ? "Есть в наличии" : "Мавҷуд ҳаст")
                  : (lang === "ru" ? "Нет в наличии" : "Мавҷуд нест")}
              </div>
              <div className="catalog-label" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span>{t.catalogNumber} {p.catalog_number}</span>
                <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  {isDiscountActive(p) && (
                    <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: 12 }}>
                      {Math.round(p.price / (1 - (p.discount_percent as number) / 100))} смн
                    </span>
                  )}
                  <span className="price" style={{ color: "#4CAF50" }}>{p.price} смн</span>
                </span>
              </div>
              <StarRating avgRating={p.avg_rating} reviewCount={p.review_count} />
            </div>
          ))}
        </div>
      </div>

      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: 360,
              maxWidth: "90vw",
              background: "var(--bg)",
              borderLeft: "1px solid var(--line)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <span className="product-title" style={{ fontSize: 20 }}>{t.cart}</span>
              <span onClick={() => setCartOpen(false)} style={{ cursor: "pointer", fontSize: 20 }}>×</span>
            </div>

            {checkoutStep === "cart" && (
              <>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  {cart.items.length === 0 && (
                    <p style={{ color: "var(--text-muted)" }}>{t.noProducts}</p>
                  )}
                  {cart.items.map((item) => (
                    <div
                      key={item.variantId}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        paddingBottom: 14,
                        marginBottom: 14,
                      }}
                    >
                      <div className="product-title" style={{ fontSize: 15, marginBottom: 6 }}>
                        {item.title}
                      </div>
                      <div className="catalog-label" style={{ marginBottom: 8 }}>
                        {item.size} / {item.color}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            onClick={() => cart.updateQty(item.variantId, item.qty - 1)}
                            style={{ cursor: "pointer", fontFamily: "var(--font-label)" }}
                          >
                            −
                          </span>
                          <span style={{ fontFamily: "var(--font-label)" }}>{item.qty}</span>
                          <span
                            onClick={() => cart.updateQty(item.variantId, item.qty + 1)}
                            style={{ cursor: "pointer", fontFamily: "var(--font-label)" }}
                          >
                            +
                          </span>
                        </div>
                        <span className="price">{item.price * item.qty} смн</span>
                        <span
                          onClick={() => cart.removeItem(item.variantId)}
                          style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12 }}
                        >
                          ✕
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {cart.items.length > 0 && (
                  <div style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <span className="product-title" style={{ fontSize: 16 }}>Итого</span>
                      <span className="price" style={{ fontSize: 16 }}>{cart.totalPrice} смн</span>
                    </div>
                    <button
                      onClick={() => setCheckoutStep("form")}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: "var(--text)",
                        color: "var(--bg)",
                        border: "none",
                        fontFamily: "var(--font-label)",
                        fontSize: 13,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                      }}
                    >
                      Оформить заказ
                    </button>
                  </div>
                )}
              </>
            )}

            {checkoutStep === "form" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <input
                  placeholder="Имя"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                />
                <input
                  placeholder="Телефон"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                />
                <input
                  placeholder="Адрес доставки"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                />
                <textarea
                  placeholder="Комментарий (необязательно)"
                  value={orderComment}
                  onChange={(e) => setOrderComment(e.target.value)}
                  rows={3}
                  style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14, resize: "none" }}
                />

                <div>
                  <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 10 }}>
                    Способ оплаты
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div
                      onClick={() => setPaymentMethod("qr")}
                      style={{
                        flex: 1,
                        padding: 12,
                        textAlign: "center",
                        border: paymentMethod === "qr" ? "1px solid var(--accent)" : "1px solid var(--line)",
                        color: paymentMethod === "qr" ? "var(--accent)" : "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      QR-код
                    </div>
                    <div
                      onClick={() => auth.customer && setPaymentMethod("card")}
                      style={{
                        flex: 1,
                        padding: 12,
                        textAlign: "center",
                        border: paymentMethod === "card" ? "1px solid var(--accent)" : "1px solid var(--line)",
                        color: !auth.customer ? "var(--line)" : paymentMethod === "card" ? "var(--accent)" : "var(--text-muted)",
                        cursor: auth.customer ? "pointer" : "not-allowed",
                        fontSize: 13,
                      }}
                    >
                      Карта {!auth.customer && "(войдите)"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placing || !customerName || !customerPhone || !deliveryAddress}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: "var(--text)",
                      color: "var(--bg)",
                      border: "none",
                      fontFamily: "var(--font-label)",
                      fontSize: 13,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      opacity: placing ? 0.6 : 1,
                    }}
                  >
                    {placing ? "Оформляем..." : "Подтвердить заказ"}
                  </button>
                  <span
                    onClick={() => setCheckoutStep("cart")}
                    style={{ textAlign: "center", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}
                  >
                    ← Назад в корзину
                  </span>
                </div>
              </div>
            )}
            {checkoutStep === "payment" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20 }}>
                <span className="product-title" style={{ fontSize: 18 }}>Заказ №{orderNumber} создан</span>

                {paymentMethod === "qr" ? (
                  <>
                    <div
                      style={{
                        width: 180,
                        height: 180,
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        fontSize: 12,
                      }}
                    >
                      QR-код (макет)
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 260 }}>
                      Отсканируйте QR-код и оплатите {cart.totalPrice} смн. После оплаты заказ будет подтверждён автоматически.
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: "100%",
                        padding: 20,
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <input
                        placeholder="Номер карты"
                        disabled
                        style={{ width: "100%", padding: 10, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text-muted)", fontSize: 13, boxSizing: "border-box" }}
                      />
                      <div style={{ display: "flex", gap: 10, width: "100%" }}>
                        <input
                          placeholder="ММ/ГГ"
                          disabled
                          style={{ flex: 1, minWidth: 0, padding: 10, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text-muted)", fontSize: 13, boxSizing: "border-box" }}
                        />
                        <input
                          placeholder="CVV"
                          disabled
                          style={{ flex: 1, minWidth: 0, padding: 10, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text-muted)", fontSize: 13, boxSizing: "border-box" }}
                        />
                      </div>
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 260 }}>
                      Оплата картой {cart.totalPrice} смн (макет — интеграция с эквайрингом появится позже).
                    </p>
                  </>
                )}

                <button
                  onClick={() => {
                    setCheckoutStep("done");
                  }}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "var(--text)",
                    color: "var(--bg)",
                    border: "none",
                    fontFamily: "var(--font-label)",
                    fontSize: 13,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Я оплатил (макет)
                </button>
              </div>
            )}

            {checkoutStep === "done" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
                <span className="product-title" style={{ fontSize: 20 }}>Спасибо за заказ!</span>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  Заказ №{orderNumber} принят. Мы свяжемся с вами по телефону {customerPhone}.
                </p>
                <button
                  onClick={() => {
                    cart.items.forEach((i) => cart.removeItem(i.variantId));
                    setCheckoutStep("cart");
                    setCartOpen(false);
                    setCustomerName("");
                    setCustomerPhone("");
                    setDeliveryAddress("");
                    setOrderComment("");
                    setOrderNumber(null);
                  }}
                  style={{
                    padding: "12px 24px",
                    background: "transparent",
                    color: "var(--text)",
                    border: "1px solid var(--line)",
                    fontFamily: "var(--font-label)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Закрыть
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <div
          onClick={() => setAuthOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--line)",
              padding: 32,
              width: 340,
              maxWidth: "90vw",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <span className="product-title" style={{ fontSize: 20, marginBottom: 10 }}>
              {authMode === "login" ? (lang === "ru" ? "Вход" : "Даромадан") : (lang === "ru" ? "Регистрация" : "Бақайдгирӣ")}
            </span>

            {authMode === "register" && (
              <input
                placeholder={lang === "ru" ? "Имя" : "Ном"}
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
              />
            )}
            <input
              placeholder={lang === "ru" ? "Телефон" : "Телефон"}
              value={authPhone}
              onChange={(e) => setAuthPhone(e.target.value)}
              style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
            />
            <input
              type="password"
              placeholder={lang === "ru" ? "Пароль" : "Парол"}
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
            />

            {authError && <span style={{ color: "#c0504d", fontSize: 13 }}>{authError}</span>}

            <button
              onClick={handleAuthSubmit}
              style={{
                padding: "14px",
                background: "var(--text)",
                color: "var(--bg)",
                border: "none",
                fontFamily: "var(--font-label)",
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {authMode === "login" ? (lang === "ru" ? "Войти" : "Даромадан") : (lang === "ru" ? "Зарегистрироваться" : "Бақайд гирифтан")}
            </button>

            <span
              onClick={() => {
                setAuthMode(authMode === "login" ? "register" : "login");
                setAuthError("");
              }}
              style={{ textAlign: "center", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}
            >
              {authMode === "login"
                ? (lang === "ru" ? "Нет аккаунта? Зарегистрироваться" : "Ҳисоб надоред? Бақайд гиред")
                : (lang === "ru" ? "Уже есть аккаунт? Войти" : "Ҳисоб доред? Ворид шавед")}
            </span>
          </div>
        </div>
      )}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text)",
            color: "var(--bg)",
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
      <Footer lang={lang} />
    </div>
  );
}
function AutoSlideImage({ images, onClick }: { images: { url: string }[]; onClick: () => void }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div
      onClick={onClick}
      style={{
        position: "absolute",
        inset: 0,
        cursor: "pointer",
        backgroundImage: images[index] ? `url(${images[index].url})` : "none",
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        transition: "background-image 0.3s ease",
      }}
    />
  );
}
