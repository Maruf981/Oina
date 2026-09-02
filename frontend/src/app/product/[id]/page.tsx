"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "../../cart-context";
import { useAuth } from "../../auth-context";
import { translations, Lang } from "../../translations";

type Variant = {
  id: number;
  size: string;
  color: string;
  stock: number;
};

type ProductImage = {
  id: number;
  url: string;
  color: string | null;
  sort_order: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ProductBrief = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string;
  price: number;
  images: { url: string }[];
};

type Product = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string;
  category: Category | null;
  price: number;
  material_ru: string | null;
  material_tj: string | null;
  country_of_origin_ru: string | null;
  country_of_origin_tj: string | null;
  care_instructions_ru: string | null;
  care_instructions_tj: string | null;
  description_ru: string | null;
  description_tj: string | null;
  variants: Variant[];
  images: ProductImage[];
  avg_rating: number | null;
  review_count: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const COLOR_MAP: Record<string, string> = {
  "красный": "#E24B4A",
  "тёмно-красный": "#8B1E1E",
  "темно-красный": "#8B1E1E",
  "бордовый": "#7A1F2B",
  "синий": "#378ADD",
  "тёмно-синий": "#1B3A5C",
  "темно-синий": "#1B3A5C",
  "голубой": "#85B7EB",
  "светло-голубой": "#BFE0F5",
  "зелёный": "#639922",
  "зеленый": "#639922",
  "тёмно-зелёный": "#2F4A17",
  "темно-зеленый": "#2F4A17",
  "изумрудный": "#0F6E56",
  "жёлтый": "#EF9F27",
  "желтый": "#EF9F27",
  "горчичный": "#B8860B",
  "оранжевый": "#D85A30",
  "терракотовый": "#C1653D",
  "фиолетовый": "#7F77DD",
  "сиреневый": "#B39DDB",
  "лавандовый": "#C9B8E8",
  "розовый": "#D4537E",
  "пудровый": "#E8C4C4",
  "чёрный": "#1A1A1A",
  "черный": "#1A1A1A",
  "белый": "#F5F5F0",
  "серый": "#888780",
  "светло-серый": "#C7C5BD",
  "тёмно-серый": "#4A4A47",
  "темно-серый": "#4A4A47",
  "бежевый": "#D8CBB8",
  "коричневый": "#8B5A2B",
  "хаки": "#7C7A5C",
  "мятный": "#9FE1CB",
  "золотой": "#C9A648",
  "серебристый": "#C0C0C0",
  "малиновый": "#B22245",
  "лимонный": "#E8D44D",
  "молочный": "#F2ECD9",
  "кремовый": "#EFE3C8",
};

const getColorHex = (name: string): string => {
  const key = name.trim().toLowerCase();
  return COLOR_MAP[key] || "var(--surface)";
};

const getContrastText = (hex: string): string => {
  if (!hex.startsWith("#")) return "var(--text)";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1A1A1A" : "#FFFFFF";
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const cart = useCart();
  const auth = useAuth();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState<ProductBrief[]>([]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const [shareCopied, setShareCopied] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);

  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // clipboard blocked, silently ignore
    }
    setShareMenuOpen(false);
  };

  const handleShareWhatsApp = () => {
    const url = window.location.href;
    window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
    setShareMenuOpen(false);
  };

  const handleShareTelegram = () => {
    const url = window.location.href;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}`, "_blank");
    setShareMenuOpen(false);
  };
  const t = translations[lang];

  const localized = (ru: string, tj: string | null) => (lang === "tj" && tj ? tj : ru);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
    const savedLang = localStorage.getItem("lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        if (data.variants?.length > 0) {
          setSelectedVariant(data.variants[0].id);
          setSelectedSize(data.variants[0].size);
          setSelectedColor(data.variants[0].color);
        }
        if (auth.token) {
          fetch(`${API_URL}/products/${data.id}/reviews/me`, {
            headers: { Authorization: `Bearer ${auth.token}` },
          })
            .then((res) => (res.ok ? res.json() : null))
            .then((review) => {
              if (review) setMyRating(review.rating);
            })
            .catch(() => {});
        }
        if (data.category_id) {
        fetch(`${API_URL}/products/?category_id=${data.category_id}`)
            .then((res) => res.json())
            .then((all: ProductBrief[]) => setRelated(all.filter((p) => p.id !== data.id).slice(0, 4)));
        }
      });
  }, [params.id]);

  if (!product) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size)));
  const sizesToShow = uniqueSizes.filter((size) =>
    product.variants.some((v) => v.size === size && (selectedColor === null || v.color === selectedColor))
  );
  const uniqueColors = Array.from(new Set(product.variants.map((v) => v.color)));
  const currentVariant =
    product.variants.find((v) => v.size === selectedSize && v.color === selectedColor) ?? null;
  const canAddToCart = !!currentVariant && currentVariant.stock > 0;
  const isSizeAvailable = (size: string) =>
    product.variants.some(
      (v) => v.size === size && (selectedColor === null || v.color === selectedColor) && v.stock > 0
    );
  const isColorAvailable = (color: string) =>
    product.variants.some((v) => v.color === color && v.stock > 0);
  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    const match = product.variants.find((v) => v.size === size && v.color === selectedColor);
    if (match) {
      const imgIdx = product.images.findIndex((img) => img.color === match.color);
      if (imgIdx !== -1) setActiveImage(imgIdx);
    }
  };
  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const match = product.variants.find((v) => v.color === color && v.size === selectedSize);
    if (match) {
      const imgIdx = product.images.findIndex((img) => img.color === match.color);
      if (imgIdx !== -1) setActiveImage(imgIdx);
    }
  };
  const handleSubmitRating = async (rating: number) => {
    if (!auth.token || submittingRating) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`${API_URL}/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ rating }),
      });
      if (res.ok) {
        setMyRating(rating);
        fetch(`${API_URL}/products/${product.id}`)
          .then((r) => r.json())
          .then((data) => setProduct(data));
      }
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleAddToCart = () => {
    if (!currentVariant) return;
    cart.addItem(
      {
        variantId: currentVariant.id,
        productId: product.id,
        title: localized(product.title_ru, product.title_tj),
        catalogNumber: product.catalog_number,
        price: product.price,
        size: currentVariant.size,
        color: currentVariant.color,
      },
      quantity
    );
    setQuantity(1);
    setToastMessage(lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд");
    setTimeout(() => router.push("/"), 900);
  };

  return (
    <div
      data-theme={theme}
      style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}
    >
      <div className="product-detail-container" style={{ maxWidth: 1000, margin: "0 auto", padding: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
          <span onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
            Главная
          </span>
          {product.category && (
            <>
              <span>/</span>
              <span onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
                {product.category.name}
              </span>
            </>
          )}
          <span>/</span>
          <span style={{ color: "var(--text)" }}>{localized(product.title_ru, product.title_tj)}</span>
        </div>

        <div className="product-detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, marginTop: 30 }}>
          <div>
            <div
              className="product-detail-image"
              style={{
                aspectRatio: "3/4",
                maxWidth: "75%",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                marginBottom: 10,
                backgroundImage: product.images[activeImage]
                  ? `url(${product.images[activeImage].url})`
                  : "none",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            />
            {product.images.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.images.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImage(idx)}
                    style={{
                      width: 60,
                      height: 60,
                      backgroundImage: `url(${img.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: idx === activeImage ? "2px solid var(--accent)" : "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="catalog-label" style={{ border: "none", padding: 0 }}>
                Артикул {product.catalog_number}
              </div>
              <span
                onClick={() => setShareMenuOpen(!shareMenuOpen)}
                style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6, position: "relative" }}
                title={lang === "ru" ? "Поделиться" : "Мубодила кардан"}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <circle cx="18" cy="5" r="2.5" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" />
                  <circle cx="6" cy="12" r="2.5" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" />
                  <circle cx="18" cy="19" r="2.5" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" />
                  <line x1="8.2" y1="10.8" x2="15.8" y2="6.2" stroke="var(--text-muted)" strokeWidth="1.4" />
                  <line x1="8.2" y1="13.2" x2="15.8" y2="17.8" stroke="var(--text-muted)" strokeWidth="1.4" />
                </svg>
                {shareCopied && (
                  <span
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 24,
                      background: "var(--text)",
                      color: "var(--bg)",
                      fontSize: 11,
                      padding: "4px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lang === "ru" ? "Ссылка скопирована" : "Пайванд нусхабардорӣ шуд"}
                  </span>
                )}
                {shareMenuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      top: 24,
                      background: "var(--bg)",
                      display: "flex",
                      gap: 4,
                      padding: 8,
                      zIndex: 10,
                    }}
                  >
                    <div
                      onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(); }}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      title="WhatsApp"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff">
                        <path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.06-1.33C8.5 21.51 10.2 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm5.2 14.2c-.22.62-1.28 1.2-1.76 1.24-.45.05-1.02.07-1.65-.1-.38-.11-.87-.28-1.5-.55-2.64-1.14-4.36-3.8-4.5-3.98-.13-.18-1.08-1.43-1.08-2.73s.68-1.94.92-2.2c.24-.27.52-.33.7-.33h.5c.16 0 .38-.06.59.45.22.53.75 1.83.82 1.96.07.13.11.29.02.47-.09.18-.14.29-.27.44-.14.16-.29.35-.41.47-.14.14-.28.29-.12.57.16.28.71 1.17 1.53 1.89 1.05.94 1.94 1.23 2.22 1.37.27.13.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.55.73 1.81.86.27.13.45.2.51.31.06.11.06.63-.16 1.25z"/>
                      </svg>
                    </div>
                    <div
                      onClick={(e) => { e.stopPropagation(); handleShareTelegram(); }}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: "#26A5E4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      title="Telegram"
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                        <path d="M22 4.01L2.3 11.5c-1.3.5-1.3 1.2-.24 1.53l4.98 1.55L18.2 7.05c.5-.32.96-.14.58.2l-8.5 7.67h-.02l.02.01-.32 4.9c.47 0 .68-.22.93-.47l2.24-2.15 4.66 3.42c.86.47 1.48.23 1.7-.8L22.9 5.4c.32-1.25-.47-1.82-1.13-1.4z"/>
                      </svg>
                    </div>
                    <div
                      onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                      style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                      title="Copy link"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5">
                        <rect x="9" y="9" width="12" height="12" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    </div>
                  </div>
                )}
              </span>
            </div>
            <h1 className="product-title" style={{ fontSize: 32, marginBottom: 8 }}>
              {localized(product.title_ru, product.title_tj)}
            </h1>
            <div
              style={{
                fontSize: 13,
                fontFamily: "var(--font-label)",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: product.variants.some((v) => v.stock > 0) ? "#4CAF50" : "#E24B4A",
                marginBottom: 12,
              }}
            >
              {product.variants.some((v) => v.stock > 0)
                ? (lang === "ru" ? "Есть в наличии" : "Мавчуд ҳаст")
                : (lang === "ru" ? "Нет в наличии" : "Мавчуд нест")}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ display: "flex", gap: 2 }}>
                {[1, 2, 3, 4, 5].map((n) => {
                  const displayRating = hoverRating ?? myRating ?? 0;
                  const filled = displayRating >= n;
                  return (
                    <svg
                      key={n}
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      onMouseEnter={() => auth.token && setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleSubmitRating(n)}
                      style={{ cursor: auth.token ? "pointer" : "default" }}
                    >
                      <path
                        d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.8-6.2 3.8 1.6-7-5.4-4.7 7.1-.6z"
                        fill={filled ? "var(--accent)" : "none"}
                        stroke="var(--accent)"
                        strokeWidth="1"
                      />
                    </svg>
                  );
                })}
              </div>
              {product.avg_rating ? (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {product.avg_rating.toFixed(1)} ({product.review_count})
                </span>
              ) : (
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {lang === "ru" ? "Пока нет оценок" : "Ҳанӯз баҳо нест"}
                </span>
              )}
              {!auth.token && (
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {lang === "ru" ? "— войдите, чтобы оценить" : "— барои баҳодиҳӣ ворид шавед"}
                </span>
              )}
            </div>

            <div className="price" style={{ fontSize: 22, marginBottom: 24, color: "#4CAF50" }}>
              {product.price} смн
            </div>

            {(product.description_ru || product.description_tj) && (
              <p style={{ color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                {localized(product.description_ru ?? "", product.description_tj)}
              </p>
            )}
            {product.variants.length > 0 && (
              <>
                {uniqueSizes.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      Размер
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {sizesToShow.map((size) => {
                        const active = selectedSize === size;
                        const available = isSizeAvailable(size);
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => available && handleSelectSize(size)}
                            disabled={!available}
                            style={{
                              minWidth: 26,
                              height: 28,
                              padding: "0 8px",
                              background: active ? "var(--accent)" : "var(--surface)",
                              color: active ? "var(--bg)" : available ? "var(--text)" : "var(--text-muted)",
                              border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
                              fontFamily: "var(--font-label)",
                              fontSize: 13,
                              cursor: available ? "pointer" : "not-allowed",
                              opacity: available ? 1 : 0.5,
                            }}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {uniqueColors.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: "var(--font-label)", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                      Цвет
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {uniqueColors.map((color) => {
                        const active = selectedColor === color;
                        const available = isColorAvailable(color);
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => available && handleSelectColor(color)}
                            disabled={!available}
                            style={{
                              minWidth: 36,
                              height: 28,
                              padding: "0 10px",
                              background: getColorHex(color),
                              color: getContrastText(getColorHex(color)),
                              border: "1px solid var(--line)",
                              boxShadow: active ? "0 0 0 2px var(--text)" : "none",
                              fontFamily: "var(--font-label)",
                              fontSize: 13,
                              cursor: available ? "pointer" : "not-allowed",
                              opacity: available ? 1 : 0.35,
                            }}
                          >
                            {color}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <span
                  onClick={() => setSizeGuideOpen(true)}
                  style={{
                    display: "block",
                    cursor: "pointer",
                    fontFamily: "var(--font-label)",
                    fontSize: 12,
                    color: "var(--accent)",
                    marginBottom: 16,
                  }}
                >
                  Гид по размерам
                </span>
              </>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 12, color: "var(--text-muted)" }}>
                {lang === "ru" ? "Количество" : "Миқдор"}
              </span>
              <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{ width: 36, height: 36, background: "var(--surface)", color: "var(--text)", border: "none", fontSize: 16, cursor: "pointer" }}
                >
                  −
                </button>
                <span style={{ width: 40, textAlign: "center", fontSize: 14 }}>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(currentVariant?.stock ?? 99, q + 1))}
                  style={{ width: 36, height: 36, background: "var(--surface)", color: "var(--text)", border: "none", fontSize: 16, cursor: "pointer" }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex: "0 0 55%",
                  padding: "16px",
                  background: "var(--text)",
                  color: "var(--bg)",
                  border: "none",
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Добавить в корзину
              </button>
              <button
                disabled
                style={{
                  flex: 1,
                  padding: "16px",
                  background: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid var(--line)",
                  fontFamily: "var(--font-label)",
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: "not-allowed",
                  opacity: 0.5,
                }}
              >
                Оформить заказ
              </button>
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
              {(product.material_ru || product.material_tj) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="catalog-label" style={{ border: "none", padding: 0 }}>
                    {lang === "ru" ? "Материал" : "Матоъ"}
                  </span>
                  <span style={{ fontSize: 14 }}>{localized(product.material_ru ?? "", product.material_tj)}</span>
                </div>
              )}
              {(product.country_of_origin_ru || product.country_of_origin_tj) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="catalog-label" style={{ border: "none", padding: 0 }}>
                    {lang === "ru" ? "Производство" : "Истеҳсол"}
                  </span>
                  <span style={{ fontSize: 14 }}>{localized(product.country_of_origin_ru ?? "", product.country_of_origin_tj)}</span>
                </div>
              )}
              {(product.care_instructions_ru || product.care_instructions_tj) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                  <span className="catalog-label" style={{ border: "none", padding: 0 }}>
                    {lang === "ru" ? "Уход" : "Нигоҳубин"}
                  </span>
                  <span style={{ fontSize: 14, textAlign: "right", maxWidth: "60%" }}>
                    {localized(product.care_instructions_ru ?? "", product.care_instructions_tj)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 60, borderTop: "1px solid var(--line)", paddingTop: 40 }}>
            <h2 className="product-title" style={{ fontSize: 22, marginBottom: 24 }}>
              Похожие товары
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 20 }}>
              {related.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/product/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{
                      aspectRatio: "3/4",
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      marginBottom: 10,
                      backgroundImage: p.images[0] ? `url(${p.images[0].url})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="product-title" style={{ fontSize: 14, marginBottom: 4 }}>
                    {localized(p.title_ru, p.title_tj)}
                  </div>
                  <div className="price" style={{ fontSize: 13 }}>
                    {p.price} смн
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {sizeGuideOpen && (
        <div
          onClick={() => setSizeGuideOpen(false)}
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
              width: 360,
              maxWidth: "90vw",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span className="product-title" style={{ fontSize: 18 }}>Гид по размерам</span>
              <span onClick={() => setSizeGuideOpen(false)} style={{ cursor: "pointer", fontSize: 20 }}>×</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Размер</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Грудь, см</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Талия, см</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["S", "88-92", "72-76"],
                  ["M", "92-96", "76-80"],
                  ["L", "96-100", "80-84"],
                  ["XL", "100-104", "84-88"],
                ].map(([size, chest, waist]) => (
                  <tr key={size} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 0" }}>{size}</td>
                    <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>{chest}</td>
                    <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>{waist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
              Значения примерные, могут отличаться в зависимости от модели.
            </p>
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
    </div>
  );
}