"use client";

import { cld } from "../../../lib/cld";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "../../cart-context";
import { useAuth } from "../../auth-context";
import { useFavorites } from "../../../lib/favorites";
import { SiteHeader } from "../../site-header";
import { useTheme } from "../../theme-context";
import { useLang } from "../../lang-context";
import { useCity } from "../../city-context";
import { translations, Lang } from "../../translations";
import "../../hero.css";
import "../../product-card.css";
import "./product-detail.css";

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
  media_type?: string;
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
  discount_percent: number | null;
  discount_from: string | null;
  discount_to: string | null;
  original_price: number | null;
  material_ru: string | null;
  material_tj: string | null;
  season_ru: string | null;
  season_tj: string | null;
  pattern_ru: string | null;
  pattern_tj: string | null;
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
  sold_count: number;
  size_guide: {
    size: string;
    chest: string | null;
    waist: string | null;
    garment_length: string | null;
    sleeve_length: string | null;
    shoulder_width: string | null;
  }[] | null;
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

function isDiscountActive(p: Product): boolean {
  if (!p.discount_percent) return false;
  const now = new Date();
  if (p.discount_from && new Date(p.discount_from) > now) return false;
  if (p.discount_to && new Date(p.discount_to) < now) return false;
  return true;
}

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

export default function ProductDetailClient() {
  const params = useParams();
  const router = useRouter();
  const cart = useCart();
  const auth = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [commentSaved, setCommentSaved] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [quantity, setQuantity] = useState(1);
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  useEffect(() => { document.querySelector(".pd-gallery")?.scrollTo({ left: 0, behavior: "auto" }); }, [selectedColor]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  useEffect(() => {
    if (lightbox === null) return;
    const n = product?.images.length || 1;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % n));
      else if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? i : (i - 1 + n) % n));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [lightbox, product]);
  const [mainVideoMuted, setMainVideoMuted] = useState(true);
  const [related, setRelated] = useState<ProductBrief[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<ProductBrief[]>([]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const { theme } = useTheme();
  const { lang } = useLang();
  const { city } = useCity();
  const [shareCopied, setShareCopied] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [openAcc, setOpenAcc] = useState<string | null>("material");

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
    const adminToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    fetch(`${API_URL}/products/${params.id}`, adminToken ? { headers: { Authorization: `Bearer ${adminToken}` } } : undefined)
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
              if (review) {
                setMyRating(review.rating);
                setReviewComment(review.comment || "");
              }
            })
            .catch(() => {});
        }
        if (data.category_id) {
        fetch(`${API_URL}/products/?category_id=${data.category_id}`)
            .then((res) => res.json())
            .then((all: ProductBrief[]) => setRelated(all.filter((p) => p.id !== data.id).slice(0, 4)));
        }

        try {
          const raw = localStorage.getItem("recently_viewed");
          const stored: number[] = raw ? JSON.parse(raw) : [];
          const withoutCurrent = stored.filter((id) => id !== data.id);
          const updated = [data.id, ...withoutCurrent].slice(0, 20);
          localStorage.setItem("recently_viewed", JSON.stringify(updated));

          const others = withoutCurrent.slice(0, 8);
          if (others.length > 0) {
            fetch(`${API_URL}/products/?ids=${others.join(",")}`)
              .then((res) => res.json())
              .then((list: ProductBrief[]) => setRecentlyViewed(list));
          }
        } catch {
          // localStorage недоступен (приватный режим и т.п.) — просто пропускаем
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
      setQuantity((q) => Math.min(q, match.stock || 1));
      const imgIdx = product.images.findIndex((img) => img.color === match.color);
      if (imgIdx !== -1) setActiveImage(imgIdx);
    } else if (selectedColor !== null) {
      setSelectedColor(null);
    }
  };
  const handleSelectColor = (color: string) => {
    setSelectedColor(color);
    const cImg = product.images.findIndex((img) => img.color === color);
    if (cImg !== -1) setActiveImage(cImg);
    const match = product.variants.find((v) => v.color === color && v.size === selectedSize);
    if (match) {
      setQuantity((q) => Math.min(q, match.stock || 1));
      const imgIdx = product.images.findIndex((img) => img.color === match.color);
      if (imgIdx !== -1) setActiveImage(imgIdx);
    } else if (selectedSize !== null) {
      // Выбранный ранее размер недоступен для этого цвета — сбрасываем,
      // чтобы состояние совпадало с тем, что видит пользователь (ни один размер не подсвечен)
      setSelectedSize(null);
    }
  };
  const handleSubmitRating = async (rating: number) => {
    if (!auth.token || submittingRating) return;
    setSubmittingRating(true);
    try {
      const res = await fetch(`${API_URL}/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ rating, comment: reviewComment || null }),
      });
      if (res.ok) {
        setMyRating(rating);
        setCommentSaved(true);
        setTimeout(() => setCommentSaved(false), 2500);
        fetch(`${API_URL}/products/${product.id}`)
          .then((r) => r.json())
          .then((data) => setProduct(data));
      }
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleAddToCart = async () => {
    if (!currentVariant) {
      let message: string;
      if (selectedSize === null && selectedColor === null) {
        message = lang === "ru" ? "Выберите размер и цвет" : "Андоза ва рангро интихоб кунед";
      } else if (selectedSize === null) {
        message = lang === "ru" ? "Выберите размер" : "Андозаро интихоб кунед";
      } else if (selectedColor === null) {
        message = lang === "ru" ? "Выберите цвет" : "Рангро интихоб кунед";
      } else {
        message = lang === "ru" ? "Этой комбинации размера и цвета нет в наличии" : "Ин таркиб мавҷуд нест";
      }
      setToastType("error");
      setToastMessage(message);
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    if (currentVariant.stock <= 0) {
      setToastType("error");
      setToastMessage(lang === "ru" ? "Этого товара нет в наличии" : "Ин мол мавҷуд нест");
      setTimeout(() => setToastMessage(null), 2500);
      return;
    }
    const result = await cart.addItem(
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
    if (!result.ok) {
      setToastType("error");
      setToastMessage(result.error || (lang === "ru" ? "Не удалось добавить товар в корзину" : "Илова кардан имконнопазир аст"));
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setQuantity(1);
    setToastType("success");
    setToastMessage(lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд");
    setTimeout(() => setToastMessage(null), 2000);
    window.dispatchEvent(new Event("oina:open-bag"));
  };
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
  const stockForNote = currentVariant ? currentVariant.stock : totalStock;
  const stockNote = stockForNote === 0
    ? tr("Нет в наличии", "Мавҷуд нест")
    : stockForNote <= 5
    ? tr(`Осталось ${stockForNote} шт`, `${stockForNote} дона монд`)
    : tr("В наличии", "Мавҷуд ҳаст");
  const orderedImages = selectedColor
    ? [...product.images.filter((i) => i.color === selectedColor), ...product.images.filter((i) => i.color !== selectedColor)]
    : product.images;
  const hasMaterial = !!(product.material_ru || product.season_ru || product.pattern_ru || product.country_of_origin_ru || product.care_instructions_ru);
  const specRows: { label: string; value: string }[] = [
    { label: tr("Материал", "Матоъ"), value: product.material_ru ? localized(product.material_ru, product.material_tj) : "" },
    { label: tr("Сезон", "Мавсим"), value: product.season_ru ? localized(product.season_ru, product.season_tj) : "" },
    { label: tr("Рисунок", "Акс"), value: product.pattern_ru ? localized(product.pattern_ru, product.pattern_tj) : "" },
    { label: tr("Производство", "Истеҳсол"), value: product.country_of_origin_ru ? localized(product.country_of_origin_ru, product.country_of_origin_tj) : "" },
    { label: tr("Уход", "Нигоҳубин"), value: product.care_instructions_ru ? localized(product.care_instructions_ru, product.care_instructions_tj) : "" },
  ].filter((r) => r.value);
  const deliveryText = city === "dushanbe"
    ? tr("Доставка за 24 часа по Душанбе", "Дар давоми 24 соат дар Душанбе расонида мешавад")
    : tr("Доставка в другие города — через доверенное лицо", "Ба шаҳрҳои дигар — тавассути шахси боэътимод");
  const toggleAcc = (key: string) => setOpenAcc((cur) => (cur === key ? null : key));
  const isVid = (img: { media_type?: string }) => img.media_type === "video";

  const miniRow = (title: string, list: ProductBrief[]) =>
    list.length > 0 && (
      <section className="pd-more">
        <div className="sec-head">
          <span className="coll-rule" />
          <h2 className="sec-title">{title}</h2>
        </div>
        <div className="rec-scroll">
          {list.map((p) => (
            <div key={p.id} className="rec-item">
              <div className="pc" onClick={() => router.push(`/product/${p.id}`)}>
                <div className="pc-media">
                  {(() => {
                    const isV = (m: { url: string; media_type?: string }) => m.media_type === "video" || /\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(m.url);
                    const imgs = p.images as { url: string; media_type?: string }[];
                    const photo = imgs.find((m) => !isV(m));
                    const first = photo || imgs[0];
                    if (!first) return null;
                    return (
                      <div className="pc-slides"><div className="pc-slide is-active">
                        {isV(first) ? (
                          <video src={first.url} muted loop autoPlay playsInline />
                        ) : (
                          <img src={cld(first.url, 800)} alt={localized(p.title_ru, p.title_tj)} loading="lazy" />
                        )}
                      </div></div>
                    );
                  })()}
                </div>
                <div className="pc-info">
                  <div className="pc-title">{localized(p.title_ru, p.title_tj)}</div>
                  <div className="pc-price">{p.price} смн</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );

  return (
    <div data-theme={theme} className="pd-root">
      <SiteHeader />
      <div className="pd">
        <nav className="pd-crumbs">
          <span onClick={() => router.push("/")}>{tr("Главная", "Асосӣ")}</span>
          {product.category && (
            <>
              <i>/</i>
              <span onClick={() => router.push(`/?category_id=${product.category!.id}`)}>{product.category.name}</span>
            </>
          )}
        </nav>

        <div className="pd-grid">
          <div className="pd-gallery">
            {orderedImages.length === 0 && <div className="pd-shot pd-shot--main pd-empty" />}
            {orderedImages.map((img, idx) => (
              <div key={img.id} className={`pd-shot${idx === 0 ? " pd-shot--main" : ""}`}>
                {isVid(img) ? (
                  <>
                    <video src={img.url} autoPlay muted={mainVideoMuted} loop playsInline onClick={() => setLightbox(idx)} />
                    <button className="pd-sound" onClick={() => setMainVideoMuted((m) => !m)}>
                      {mainVideoMuted ? tr("Включить звук", "Садо") : tr("Выключить звук", "Бесадо")}
                    </button>
                  </>
                ) : (
                  <img src={cld(img.url, 1600)} alt={localized(product.title_ru, product.title_tj)} loading={idx < 2 ? "eager" : "lazy"} onClick={() => setLightbox(idx)} />
                )}
              </div>
            ))}
          </div>

          {lightbox !== null && orderedImages[lightbox] && (
            <div
              className="pd-lb"
              onClick={() => setLightbox(null)}
              onTouchStart={(e) => { e.currentTarget.dataset.x = String(e.touches[0].clientX); }}
              onTouchEnd={(e) => {
                const dx = e.changedTouches[0].clientX - Number(e.currentTarget.dataset.x || 0);
                const n = orderedImages.length;
                if (Math.abs(dx) > 50) setLightbox((i) => (i === null ? i : (i + (dx < 0 ? 1 : -1) + n) % n));
              }}
            >
              {isVid(orderedImages[lightbox]) ? (
                <video className="pd-lb-media" src={orderedImages[lightbox].url} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
              ) : (
                <img className="pd-lb-media" src={cld(orderedImages[lightbox].url, 2400)} alt={localized(product.title_ru, product.title_tj)} onClick={(e) => e.stopPropagation()} />
              )}
              <button className="pd-lb-close" onClick={() => setLightbox(null)} aria-label="close">×</button>
              {orderedImages.length > 1 && (
                <>
                  <button className="pd-lb-nav pd-lb-prev" aria-label="prev" onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? i : (i - 1 + orderedImages.length) % orderedImages.length)); }}>‹</button>
                  <button className="pd-lb-nav pd-lb-next" aria-label="next" onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? i : (i + 1) % orderedImages.length)); }}>›</button>
                  <div className="pd-lb-count">{lightbox + 1} / {orderedImages.length}</div>
                </>
              )}
            </div>
          )}

          <div className="pd-info">
            <div className="pd-top">
              <div className="pd-eyebrow">
                {product.category ? `${product.category.name} · ` : ""}{tr("Арт.", "Арт.")} {product.catalog_number}
              </div>
              <div className="pd-tools">
                <button
                  className={`pd-tool${isFavorite(product.id) ? " is-on" : ""}`}
                  onClick={() => { toggleFavorite(product.id); setTimeout(() => window.dispatchEvent(new Event("oina:favorites-changed")), 700); }}
                  title={tr("В избранное", "Ба интихобҳо")}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 20.5 C12 20.5 3.5 14.6 3.5 8.9 C3.5 6 5.7 4 8.3 4 C10 4 11.3 4.9 12 6 C12.7 4.9 14 4 15.7 4 C18.3 4 20.5 6 20.5 8.9 C20.5 14.6 12 20.5 12 20.5 Z" strokeLinejoin="round" /></svg>
                </button>
                <div className="pd-share">
                  <button className="pd-tool" onClick={() => setShareMenuOpen(!shareMenuOpen)} title={tr("Поделиться", "Мубодила кардан")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8 L15.8 6.2 M8.2 13.2 L15.8 17.8" /></svg>
                  </button>
                  {shareMenuOpen && (
                    <div className="pd-share-menu">
                      <span onClick={handleShareWhatsApp}>WhatsApp</span>
                      <span onClick={handleShareTelegram}>Telegram</span>
                      <span onClick={handleCopyLink}>{tr("Копировать ссылку", "Нусхаи пайванд")}</span>
                    </div>
                  )}
                  {shareCopied && <div className="pd-share-menu"><span>{tr("Ссылка скопирована", "Пайванд нусхабардорӣ шуд")}</span></div>}
                </div>
              </div>
            </div>

            <h1 className="pd-title">{localized(product.title_ru, product.title_tj)}</h1>

            <div className="pd-price">
              <span>{product.price} смн</span>
              {isDiscountActive(product) && (
                <>
                  <s>{Math.round(product.original_price ?? (product.price / (1 - (product.discount_percent as number) / 100)))} смн</s>
                  <em>−{product.discount_percent}%</em>
                </>
              )}
            </div>

            <div className="pd-rating">
              <span className="pd-stars">
                {[1, 2, 3, 4, 5].map((n) => {
                  const shown = hoverRating ?? myRating ?? Math.round(product.avg_rating ?? 0);
                  return (
                    <svg
                      key={n}
                      viewBox="0 0 24 24"
                      className={shown >= n ? "is-on" : ""}
                      onMouseEnter={() => auth.token && setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => handleSubmitRating(n)}
                      style={{ cursor: auth.token ? "pointer" : "default" }}
                    >
                      <path d="M12 2.8l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17.3l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" />
                    </svg>
                  );
                })}
              </span>
              <span>
                {product.avg_rating ? `${product.avg_rating.toFixed(1)} (${product.review_count})` : tr("Пока нет оценок", "Ҳанӯз баҳо нест")}
                {product.sold_count > 0 && ` · ${tr(`Куплено ${product.sold_count} раз`, `${product.sold_count} бор харида шуд`)}`}
              </span>
              {!auth.token && <span className="pd-hint">{tr("Войдите, чтобы оценить", "Барои баҳодиҳӣ ворид шавед")}</span>}
            </div>

            {uniqueColors.length > 0 && (
              <div className="pd-block">
                <div className="pd-label">
                  {tr("Цвет", "Ранг")} — <b>{selectedColor ?? tr("не выбран", "интихоб нашудааст")}</b>
                </div>
                <div className="pd-colors">
                  {uniqueColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      title={color}
                      className={`pd-color${selectedColor === color ? " is-active" : ""}`}
                      disabled={!isColorAvailable(color)}
                      onClick={() => isColorAvailable(color) && handleSelectColor(color)}
                      style={{ background: getColorHex(color) }}
                    />
                  ))}
                </div>
              </div>
            )}

            {uniqueSizes.length > 0 && (
              <div className="pd-block">
                <div className="pd-label pd-label--row">
                  <span>{tr("Размер", "Андоза")}</span>
                  {product.size_guide && product.size_guide.length > 0 && (
                    <span className="pd-link" onClick={() => setSizeGuideOpen(true)}>{tr("Гид по размерам", "Маълумот оиди андоза")}</span>
                  )}
                </div>
                <div className="pd-sizes">
                  {sizesToShow.map((size) => {
                    const available = isSizeAvailable(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        className={`pd-size${selectedSize === size ? " is-active" : ""}`}
                        disabled={!available}
                        onClick={() => available && handleSelectSize(size)}
                      >
                        {size === "Безразмерный" ? tr("Безразмерный", "Беандоза") : size}
                      </button>
                    );
                  })}
                </div>
                <div className={`pd-stock${stockForNote === 0 ? " is-out" : ""}`}>{stockNote}</div>
              </div>
            )}

            <div className="pd-block pd-buy">
              <div className="pd-qty">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                <span>{quantity}</span>
                <button type="button" onClick={() => setQuantity((q) => Math.min(currentVariant?.stock ?? 99, q + 1))}>+</button>
              </div>
              <button className="pd-add" onClick={handleAddToCart} disabled={!canAddToCart && totalStock === 0}>
                {tr("Добавить в корзину", "Ба сабад")}
              </button>
            </div>
            <button
              className="pd-checkout"
              onClick={async () => {
                if (!canAddToCart) { handleAddToCart(); return; }
                await handleAddToCart();
                window.dispatchEvent(new CustomEvent("oina:open-bag", { detail: "form" }));
              }}
            >
              {tr("Оформить заказ", "Фармоиш додан")}
            </button>

            {(product.description_ru || product.description_tj) && (
              <div className="pd-block pd-desc">
                <div className="pd-label">{tr("Описание", "Тавсиф")}</div>
                <p>{localized(product.description_ru ?? "", product.description_tj)}</p>
              </div>
            )}

            <div className="pd-acc">
              {hasMaterial && (
                <div className={`pd-acc-item${openAcc === "material" ? " is-open" : ""}`}>
                  <button onClick={() => toggleAcc("material")}>{tr("Материал и уход", "Матоъ ва нигоҳубин")}<i>{openAcc === "material" ? "−" : "+"}</i></button>
                  {openAcc === "material" && (
                    <div className="pd-acc-body">
                      {specRows.map((r) => (
                        <div key={r.label} className="pd-spec"><span>{r.label}</span><span>{r.value}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className={`pd-acc-item${openAcc === "delivery" ? " is-open" : ""}`}>
                <button onClick={() => toggleAcc("delivery")}>{tr("Доставка и возврат", "Расонидан ва баргардонӣ")}<i>{openAcc === "delivery" ? "−" : "+"}</i></button>
                {openAcc === "delivery" && (
                  <div className="pd-acc-body">
                    <p>{deliveryText}.</p>
                    <p><span className="pd-link" onClick={() => router.push("/delivery")}>{tr("Подробнее о доставке и оплате", "Маълумоти бештар")}</span></p>
                  </div>
                )}
              </div>
              {auth.token && myRating !== null && (
                <div className={`pd-acc-item${openAcc === "review" ? " is-open" : ""}`}>
                  <button onClick={() => toggleAcc("review")}>{tr("Ваш отзыв", "Назари шумо")}<i>{openAcc === "review" ? "−" : "+"}</i></button>
                  {openAcc === "review" && (
                    <div className="pd-acc-body">
                      <textarea
                        className="pd-textarea"
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder={tr("Напишите отзыв о товаре (необязательно)", "Дар бораи мол назар нависед (ихтиёрӣ)")}
                        maxLength={1000}
                        rows={4}
                      />
                      <div className="pd-review-row">
                        <button className="pd-link-btn" onClick={() => handleSubmitRating(myRating)} disabled={submittingRating}>
                          {tr("Сохранить отзыв", "Назарро нигоҳ доред")}
                        </button>
                        {commentSaved && <span className="pd-hint">{tr("Сохранено", "Нигоҳ дошта шуд")}</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {miniRow(tr("Похожие товары", "Монанд ба ин"), related)}
        {miniRow(tr("Вы недавно смотрели", "Ба наздикӣ дидед"), recentlyViewed)}
      </div>

      {sizeGuideOpen && (
        <div className="pd-modal-bg" onClick={() => setSizeGuideOpen(false)}>
          <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-head">
              <span className="pd-modal-title">{tr("Гид по размерам", "Маълумот оиди андоза")}</span>
              <button className="pd-link-btn" onClick={() => setSizeGuideOpen(false)}>{tr("Закрыть", "Пӯшидан")}</button>
            </div>
            {[
              { label: "", rows: (product.size_guide ?? []).filter((r) => !/^\d+$/.test(r.size)) },
              { label: tr("Числовые размеры", "Андозаҳои рақамӣ"), rows: (product.size_guide ?? []).filter((r) => /^\d+$/.test(r.size)) },
            ].map(({ label, rows }) =>
              rows.length > 0 && (
                <div key={label || "letters"} className="pd-table-wrap">
                  {label && <div className="pd-label">{label}</div>}
                  <table className="pd-table">
                    <thead>
                      <tr>
                        <th>{tr("Размер", "Андоза")}</th>
                        <th>{tr("Грудь", "Сина")}</th>
                        <th>{tr("Талия", "Миён")}</th>
                        <th>{tr("Длина", "Дарозӣ")}</th>
                        <th>{tr("Рукав", "Остин")}</th>
                        <th>{tr("Плечи", "Китф")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.size}>
                          <td>{row.size}</td>
                          <td>{row.chest || "—"}</td>
                          <td>{row.waist || "—"}</td>
                          <td>{row.garment_length || "—"}</td>
                          <td>{row.sleeve_length || "—"}</td>
                          <td>{row.shoulder_width || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
            <p className="pd-hint">
              {tr("Значения примерные — точные параметры могут отличаться в зависимости от вашего роста и веса.", "Андозаҳо тахминӣ мебошанд — андозаҳои дақиқ метавонанд вобаста ба қаду вазни шумо фарқ кунанд.")}
            </p>
          </div>
        </div>
      )}

      {toastMessage && <div className={`pd-toast${toastType === "error" ? " is-error" : ""}`}>{toastMessage}</div>}
    </div>
  );
}
