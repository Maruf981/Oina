"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { translations, Lang } from "./translations";
import { useCart } from "./cart-context";
import { useAuth } from "./auth-context";
import { useTheme } from "./theme-context";
import { useLang } from "./lang-context";
import { useCity } from "./city-context";
import { Footer } from "./footer";
import { useRouter, useSearchParams } from "next/navigation";

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
  media_type?: string;
};

type Category = {
  id: number;
  name: string;
  name_tj?: string | null;
  slug: string;
  parent_id: number | null;
};
type HomepageReview = {
  id: number;
  rating: number;
  comment: string;
  product_id: number;
  product_title_ru: string;
  product_title_tj: string | null;
  product_image: string | null;
  customer_name: string | null;
};
type Banner = {
  id: number;
  image_url: string | null;
  title: string;
  subtitle: string | null;
  product_id: number | null;
  category_id: number | null;
  sort_order: number;
  text_color: string;
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

function isValidPhone(phone: string): boolean {
  return /^(\+992\d{9}|\d{9})$/.test(phone.trim());
}
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

function getRecommendedBadge(p: Product): { text: string; color: string } | null {
  if (isDiscountActive(p) && p.discount_percent) return { text: `-${p.discount_percent}%`, color: "#D64545" };
  if (p.is_new) return { text: "Новинка", color: "#3E8E5A" };
  if (p.is_featured) return { text: "Хорошая цена", color: "#3B6EA8" };
  return null;
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

function HomeInner() {
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    const v = searchParams.get("category_id");
    return v ? Number(v) : null;
  });
  const [openMegaMenu, setOpenMegaMenu] = useState<number | null>(null);
  useEffect(() => {
    fetch(`${API_URL}/categories/`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/banners/`)
      .then((r) => r.json())
      .then(setBanners)
      .catch(() => setBanners([]));
  }, []);
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [homepageReviews, setHomepageReviews] = useState<HomepageReview[]>([]);
  const [recommendedCollapsed, setRecommendedCollapsed] = useState(false);
  const recommendedScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingRecommended, setIsDraggingRecommended] = useState(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const { city, toggleCity } = useCity();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [minPrice, setMinPrice] = useState(() => searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("max_price") || "");
  const [filterSize, setFilterSize] = useState(() => searchParams.get("size") || "");
  const [filterColor, setFilterColor] = useState(() => searchParams.get("color") || "");
  const [sortOption, setSortOption] = useState(() => searchParams.get("sort") || "");
  const [filterOptions, setFilterOptions] = useState<{ sizes: string[]; colors: { name: string; hex: string }[]; materials: { ru: string; tj: string }[]; seasons: { ru: string; tj: string }[] }>({ sizes: [], colors: [], materials: [], seasons: [] });
  const [filterMaterial, setFilterMaterial] = useState(() => searchParams.get("material") || "");
  const [filterSeason, setFilterSeason] = useState(() => searchParams.get("season") || "");
  const [filterBrandOnly, setFilterBrandOnly] = useState(() => searchParams.get("brand_only") === "true");
  const [filterInStock, setFilterInStock] = useState(() => searchParams.get("in_stock_only") === "true");
  const [filterOnSale, setFilterOnSale] = useState(() => searchParams.get("on_sale_only") === "true");
  const [filterRecommendedOnly, setFilterRecommendedOnly] = useState(
    () => searchParams.get("recommended") === "1" || searchParams.get("recommended_only") === "true"
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "form" | "payment" | "done">("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [orderComment, setOrderComment] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card">("qr");
  const t = translations[lang];
  const cart = useCart();
  const auth = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const handleCloseAuth = () => {
    setAuthOpen(false);
    if (searchParams.get("login") === "1") {
      router.replace("/");
    }
  };
  useEffect(() => {
    setAuthOpen(searchParams.get("login") === "1");
  }, [searchParams]);
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategoryId(Number(catParam));
      setTimeout(() => {
        document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams]);
  useEffect(() => {
    if (searchParams.get("cart") === "1") {
      setCartOpen(true);
      router.replace("/");
    }
  }, [searchParams]);
  useEffect(() => {
    if (!auth.customer) return;
    if (!customerName && auth.customer.name) setCustomerName(auth.customer.name);
    if (!customerPhone && auth.customer.phone) setCustomerPhone(auth.customer.phone);
    if (!deliveryAddress && auth.customer.address) setDeliveryAddress(auth.customer.address);
  }, [auth.customer]);
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [resetStep, setResetStep] = useState<"phone" | "code">("phone");
  const [resetCode, setResetCode] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [quickAddProductId, setQuickAddProductId] = useState<number | null>(null);
  const [quickAddSize, setQuickAddSize] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const localized = (ru: string, tj: string | null) => (lang === "tj" && tj ? tj : ru);

  const guestFavoritesMergedRef = useRef(false);

  useEffect(() => {
    if (!auth.token) {
      const saved = localStorage.getItem("guest_favorites");
      if (saved) {
        try {
          setFavoriteIds(new Set(JSON.parse(saved)));
        } catch {
          // ignore corrupt data
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!auth.token) {
      localStorage.setItem("guest_favorites", JSON.stringify(Array.from(favoriteIds)));
    }
  }, [favoriteIds, auth.token]);

  useEffect(() => {
    const run = async () => {
      if (!auth.token || guestFavoritesMergedRef.current) return;
      guestFavoritesMergedRef.current = true;

      const saved = localStorage.getItem("guest_favorites");
      let guestIds: number[] = [];
      if (saved) {
        try {
          guestIds = JSON.parse(saved);
        } catch {
          guestIds = [];
        }
      }

      for (const productId of guestIds) {
        try {
          await fetch(`${API_URL}/favorites/${productId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${auth.token}` },
          });
        } catch {
          // skip failed item
        }
      }

      localStorage.removeItem("guest_favorites");

      fetch(`${API_URL}/favorites/`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((favs: { product: { id: number } }[]) => {
          setFavoriteIds(new Set(favs.map((f) => f.product.id)));
        })
        .catch(() => {});
    };
    run();
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) {
      guestFavoritesMergedRef.current = false;
    }
  }, [auth.token]);

  const toggleFavorite = async (productId: number) => {
    const isFav = favoriteIds.has(productId);

    if (!auth.token) {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });
      return;
    }

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
      handleCloseAuth();
      setAuthName("");
      setAuthPhone("");
      setAuthPassword("");
    } catch {
      setAuthError(lang === "ru" ? "Неверный телефон или пароль" : "Телефон ё парол нодуруст");
    }
  };

  const handleResetVerify = async () => {
    setAuthError("");
    setResetSuccess("");
    try {
      const res = await fetch(`${API_URL}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: authPhone, code: resetCode, new_password: resetNewPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "reset failed");
      }
      setResetSuccess(lang === "ru" ? "Пароль изменён! Теперь можно войти." : "Парол иваз шуд! Ҳоло метавонед ворид шавед.");
      setResetCode("");
      setResetNewPassword("");
    } catch {
      setAuthError(lang === "ru" ? "Неверный или устаревший код" : "Рамз нодуруст ё кӯҳна аст");
    }
  };

  const handlePlaceOrder = async () => {
    setAttemptedSubmit(true);
    if (!customerName || !customerPhone || !deliveryAddress || !landmark || !isValidPhone(customerPhone)) {
      return;
    }
    setPlacing(true);
    try {
      const fullAddress = `${deliveryAddress}, Ориентир: ${landmark}`;
      const res = await fetch(`${API_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: fullAddress,
          comment: orderComment,
          payment_method: paymentMethod,
          items: cart.items.map((item) => ({
            product_variant_id: item.variantId,
            quantity: item.qty,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Order failed");
      }
      const order = await res.json();
      await cart.clearCart();
      setOrderNumber(order.id);
      setCheckoutStep("payment");
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "";
      const friendlyMsg = msg.includes("В наличии только")
        ? msg
        : (lang === "ru" ? "Ошибка оформления заказа. Попробуйте ещё раз." : "Хатогӣ ҳангоми фармоиш. Бори дигар кӯшиш кунед.");
      setToastType("error");
      setToastMessage(friendlyMsg);
      setTimeout(() => setToastMessage(null), 3000);
      setPlacing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (minPrice) params.set("min_price", minPrice);
      if (maxPrice) params.set("max_price", maxPrice);
      if (filterSize) params.set("size", filterSize);
      if (filterColor) params.set("color", filterColor);
      if (selectedCategoryId) params.set("category_id", String(selectedCategoryId));
      if (filterRecommendedOnly) params.set("recommended_only", "true");
      if (sortOption) params.set("sort", sortOption);
      if (filterMaterial) params.set("material", filterMaterial);
      if (filterSeason) params.set("season", filterSeason);
      if (filterBrandOnly) params.set("brand_only", "true");
      if (filterInStock) params.set("in_stock_only", "true");
      if (filterOnSale) params.set("on_sale_only", "true");
      const managedKeys = [
        "search", "min_price", "max_price", "size", "color", "category_id",
        "recommended_only", "sort", "material", "season", "brand_only",
        "in_stock_only", "on_sale_only",
      ];
      const urlParams = new URLSearchParams(searchParams.toString());
      managedKeys.forEach((key) => urlParams.delete(key));
      params.forEach((value, key) => urlParams.set(key, value));
      const newQuery = urlParams.toString();
      if (newQuery !== searchParams.toString()) {
        router.replace(newQuery ? `/?${newQuery}` : "/", { scroll: false });
      }
      fetch(`${API_URL}/products/?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          setVisibleCount(20);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setProducts([]);
        });
    }, 350);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, minPrice, maxPrice, filterSize, filterColor, selectedCategoryId, searchParams, sortOption, filterMaterial, filterSeason, filterBrandOnly, filterInStock, filterOnSale, filterRecommendedOnly]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oina_search_history");
      if (raw) setSearchHistory(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      fetch(`${API_URL}/products/?search=${encodeURIComponent(q)}&limit=5`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => setSearchSuggestions(data))
        .catch((err) => {
          if (err.name !== "AbortError") setSearchSuggestions([]);
        });
    }, 250);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function saveSearchToHistory(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setSearchHistory((prev) => {
      const next = [trimmed, ...prev.filter((h) => h !== trimmed)].slice(0, 8);
      try {
        localStorage.setItem("oina_search_history", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  useEffect(() => {
    fetch(`${API_URL}/products/?recommended_only=true`)
      .then((res) => res.json())
      .then((data) => setRecommendedProducts(data))
      .catch(() => setRecommendedProducts([]));
  }, []);
  useEffect(() => {
    fetch(`${API_URL}/reviews/homepage`)
      .then((res) => res.json())
      .then((data) => setHomepageReviews(data))
      .catch(() => setHomepageReviews([]));
  }, []);
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategoryId) params.set("category_id", String(selectedCategoryId));
    fetch(`${API_URL}/products/filter-options?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setFilterOptions(data);
        if (filterSize && !data.sizes.includes(filterSize)) setFilterSize("");
        if (filterColor && !data.colors.some((c: { name: string }) => c.name === filterColor)) setFilterColor("");
        if (filterMaterial && !data.materials.some((m: { ru: string }) => m.ru === filterMaterial)) setFilterMaterial("");
        if (filterSeason && !data.seasons.some((s: { ru: string }) => s.ru === filterSeason)) setFilterSeason("");
      })
      .catch(() => setFilterOptions({ sizes: [], colors: [], materials: [], seasons: [] }));
  }, [selectedCategoryId]);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { rootMargin: "150px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [products]);

  return (
    <div data-theme={theme} style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh", paddingTop: 124 }}>
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
            padding: "24px 20px",
            gap: 10,
            position: "relative",
          }}
        >
        <div
          className="burger-icon-desktop-hide"
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

        <span
          className="city-selector"
          onClick={toggleCity}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-label)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
          }}
          title={lang === "ru" ? "Сменить город" : "Шаҳрро иваз кунед"}
        >
          <span>📍</span>
          <span className="city-selector-label">
            {city === "dushanbe" ? (lang === "ru" ? "Душанбе" : "Душанбе") : (lang === "ru" ? "Другой город" : "Шаҳри дигар")}
          </span>
          <span style={{ fontSize: 9 }}>▾</span>
        </span>
        <img
          src={theme === "dark" ? "/logo.png" : "/logo-light.png"}
          alt="Oina.tj"
          style={{ height: "clamp(28px, 8vw, 48px)", position: "absolute", left: "50%", transform: "translateX(-50%)" }}
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
            onClick={() => router.push("/favorites")}
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
      
      <div
        style={{
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "8px 12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>🚚</span>{lang === "ru" ? "Доставка за 1 день" : "Дар 1 рӯз"}
        </span>
        <span className="trust-bar-secondary" style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>🔄</span>{lang === "ru" ? "Обмен 24ч" : "Иваз 24 соат"}
        </span>
        <span className="trust-bar-secondary" style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>↩️</span>{lang === "ru" ? "Бесплатный возврат" : "Баргардонии ройгон"}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>💳</span>{lang === "ru" ? "Оплата картой/QR" : "Пардохт бо корт/QR"}
        </span>
      </div>
    </nav>

      <div style={{ padding: "16px 40px", borderBottom: "1px solid var(--line)", position: "relative" }} ref={searchContainerRef}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveSearchToHistory(searchQuery);
              setShowSuggestions(false);
            }}
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
                borderBottom: "1px solid var(--line)",
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
            <line x1="3" y1="6" x2="17" y2="6" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
            <circle cx="12" cy="6" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
            <line x1="3" y1="14" x2="17" y2="14" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
            <circle cx="8" cy="14" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--text-muted)"} strokeWidth="1" />
          </svg>
        </div>

        {showSuggestions && (searchQuery.trim() ? searchSuggestions.length > 0 : searchHistory.length > 0) && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 40,
              right: 40,
              background: "var(--bg)",
              border: "1px solid var(--line)",
              borderTop: "none",
              zIndex: 20,
              maxHeight: 360,
              overflowY: "auto",
            }}
          >
            {searchQuery.trim() ? (
              searchSuggestions.map((p) => (
                <div
                  key={p.id}
                  onMouseDown={() => {
                    saveSearchToHistory(searchQuery);
                    setShowSuggestions(false);
                    router.push(`/product/${p.id}`);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  {p.images && p.images[0] && (
                    <img
                      src={p.images[0].url}
                      alt={p.title_ru}
                      style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                    />
                  )}
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>
                    {lang === "ru" ? p.title_ru : p.title_tj || p.title_ru}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{p.price} с.</span>
                </div>
              ))
            ) : (
              searchHistory.map((h) => (
                <div
                  key={h}
                  onMouseDown={() => {
                    setSearchQuery(h);
                    setShowSuggestions(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 16px",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>🕓</span>
                  <span>{h}</span>
                </div>
              ))
            )}
          </div>
        )}

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
              {filterOptions.sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {filterOptions.colors.map((c) => (
                <span
                  key={c.name}
                  onClick={() => setFilterColor(filterColor === c.name ? "" : c.name)}
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
            <select
              value={filterMaterial}
              onChange={(e) => setFilterMaterial(e.target.value)}
              style={{
                padding: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: 13,
              }}
            >
              <option value="">{lang === "ru" ? "Материал" : "Матоъ"}</option>
              {filterOptions.materials.map((m) => (
                <option key={m.ru} value={m.ru}>{lang === "ru" ? m.ru : m.tj}</option>
              ))}
            </select>
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              style={{
                padding: "8px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                color: "var(--text)",
                fontSize: 13,
              }}
            >
              <option value="">{lang === "ru" ? "Сезон" : "Мавсим"}</option>
              {filterOptions.seasons.map((s) => (
                <option key={s.ru} value={s.ru}>{lang === "ru" ? s.ru : s.tj}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filterBrandOnly}
                onChange={(e) => setFilterBrandOnly(e.target.checked)}
              />
              {lang === "ru" ? "Только бренды" : "Танҳо брендҳо"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filterInStock}
                onChange={(e) => setFilterInStock(e.target.checked)}
              />
              {lang === "ru" ? "Только в наличии" : "Танҳо мавҷуд"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={filterOnSale}
                onChange={(e) => setFilterOnSale(e.target.checked)}
              />
              {lang === "ru" ? "Только со скидкой" : "Танҳо бо тахфиф"}
            </label>
            <span
              onClick={() => {
                setMinPrice("");
                setMaxPrice("");
                setFilterSize("");
                setFilterColor("");
                setFilterMaterial("");
                setFilterSeason("");
                setFilterBrandOnly(false);
                setFilterInStock(false);
                setFilterOnSale(false);
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
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 150,
          }}
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
              padding: "24px 0",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
              borderTopRightRadius: 16,
              borderBottomRightRadius: 16,
            }}
          >
            <div style={{ marginBottom: 20, padding: "0 24px" }}>
              <span
                className="catalog-label"
                style={{ border: "none", padding: 0, fontSize: 18, color: "var(--text)" }}
              >
                {t.categories}
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {categories.filter((c) => !c.parent_id).map((parent) => {
                const children = categories.filter((c) => c.parent_id === parent.id);
                const isExpanded = openMegaMenu === parent.id;
                return (
                  <div key={parent.id}>
                    <span
                      onClick={() => {
                        if (children.length > 0) {
                          setOpenMegaMenu(isExpanded ? null : parent.id);
                        } else {
                          setSelectedCategoryId(parent.id);
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
                      {lang === "tj" && parent.name_tj ? parent.name_tj : parent.name}
                      {children.length > 0 && (
                        <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{isExpanded ? "\u2212" : "+"}</span>
                      )}
                    </span>
                    {isExpanded && (
                      <div style={{ display: "flex", flexDirection: "column", background: "var(--bg)" }}>
                        <span
                          onClick={() => {
                            setSelectedCategoryId(parent.id);
                            setMenuOpen(false);
                          }}
                          style={{
                            fontFamily: "var(--font-label)",
                            fontSize: 13,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                            cursor: "pointer",
                            padding: "12px 24px 12px 36px",
                            color: "var(--accent)",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          {lang === "ru" ? "Все товары" : "Ҳамаи молҳо"}
                        </span>
                        {children.map((child) => (
                          <span
                            key={child.id}
                            onClick={() => {
                              setSelectedCategoryId(child.id);
                              setMenuOpen(false);
                            }}
                            style={{
                              fontFamily: "var(--font-label)",
                              fontSize: 13,
                              cursor: "pointer",
                              padding: "12px 24px 12px 36px",
                              color: selectedCategoryId === child.id ? "var(--accent)" : "var(--text)",
                              borderBottom: "1px solid var(--line)",
                            }}
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
          </div>
        </div>
      )}
      <div
        className="category-nav-desktop"
        style={{
          display: "flex",
          gap: 32,
          padding: "0 40px",
          borderBottom: "1px solid var(--line)",
          position: "relative",
        }}
      >
        {categories.filter((c) => !c.parent_id).map((parent) => {
          const children = categories.filter((c) => c.parent_id === parent.id);
          return (
            <div
              key={parent.id}
              onMouseEnter={() => setOpenMegaMenu(parent.id)}
              onMouseLeave={() => setOpenMegaMenu(null)}
              style={{ position: "relative" }}
            >
              <span
                onClick={() => setSelectedCategoryId(parent.id)}
                style={{
                  display: "block",
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
                {lang === "tj" && parent.name_tj ? parent.name_tj : parent.name}
              </span>
              {openMegaMenu === parent.id && children.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                    padding: "16px 0",
                    minWidth: 220,
                    zIndex: 140,
                  }}
                >
                  <span
                    onClick={() => {
                      setSelectedCategoryId(parent.id);
                      setOpenMegaMenu(null);
                    }}
                    style={{
                      display: "block",
                      padding: "8px 24px",
                      fontSize: 13,
                      color: "var(--accent)",
                      cursor: "pointer",
                      fontFamily: "var(--font-label)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {lang === "ru" ? "Все товары" : "Ҳамаи молҳо"}
                  </span>
                  {children.map((child) => (
                    <span
                      key={child.id}
                      onClick={() => {
                        setSelectedCategoryId(child.id);
                        setOpenMegaMenu(null);
                      }}
                      style={{
                        display: "block",
                        padding: "8px 24px",
                        fontSize: 14,
                        color: selectedCategoryId === child.id ? "var(--accent)" : "var(--text)",
                        cursor: "pointer",
                      }}
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
      <BannerSlider banners={banners} router={router} />

      {recommendedProducts.length > 0 && (
        <div className="recommended-wrapper" style={{ padding: "24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 className="product-title" style={{ fontSize: 22 }}>{t.recommended}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span
                onClick={() => router.push("/?recommended=1")}
                style={{ fontSize: 13, color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {t.seeAll} →
              </span>
              <span
                onClick={() => setRecommendedCollapsed((v) => !v)}
                style={{ fontSize: 13, color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {recommendedCollapsed ? "▼" : "▲"}
              </span>
            </div>
          </div>
          {!recommendedCollapsed && (
            <div
              onMouseDown={(e) => {
                setIsDraggingRecommended(true);
                dragStartXRef.current = e.pageX;
                dragStartScrollRef.current = recommendedScrollRef.current?.scrollLeft ?? 0;
              }}
              onMouseMove={(e) => {
                if (!isDraggingRecommended || !recommendedScrollRef.current) return;
                const delta = e.pageX - dragStartXRef.current;
                recommendedScrollRef.current.scrollLeft = dragStartScrollRef.current - delta;
              }}
              onMouseUp={() => setIsDraggingRecommended(false)}
              onMouseLeave={() => setIsDraggingRecommended(false)}
              style={{ background: "var(--surface)", borderRadius: 16, padding: "16px 12px", display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                onClick={() => recommendedScrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                style={{ fontSize: 32, color: "#444441", cursor: "pointer", flexShrink: 0, userSelect: "none", lineHeight: 1 }}
              >
                ‹
              </span>
              <div
                ref={recommendedScrollRef}
                className="recommended-scroll"
                style={{ display: "flex", gap: 12, overflowX: "auto", scrollBehavior: isDraggingRecommended ? "auto" : "smooth", cursor: isDraggingRecommended ? "grabbing" : "grab", WebkitOverflowScrolling: "touch" }}
              >
                {recommendedProducts.map((p) => {
                  const badge = getRecommendedBadge(p);
                  return (
                    <div
                      key={p.id}
                      onClick={() => { if (!isDraggingRecommended) router.push(`/product/${p.id}`); }}
                      className="recommended-card"
                      style={{ cursor: "pointer", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", background: "var(--bg)" }}
                    >
                      <div style={{ position: "relative", aspectRatio: "3/4", background: "var(--surface)", marginBottom: 8 }}>
                        <AutoSlideImage images={p.images} onClick={() => { if (!isDraggingRecommended) router.push(`/product/${p.id}`); }} />
                        {badge && (
                          <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 500, background: badge.color, color: "#fff", padding: "3px 8px", borderRadius: 4 }}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 8px" }}>
                        {localized(p.title_ru, p.title_tj)}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", padding: "0 8px 8px" }}>{p.price} смн</div>
                    </div>
                  );
                })}
              </div>
              <span
                onClick={() => recommendedScrollRef.current?.scrollBy({ left: 300, behavior: "smooth" })}
                style={{ fontSize: 32, color: "#444441", cursor: "pointer", flexShrink: 0, userSelect: "none", lineHeight: 1 }}
              >
                ›
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: "8px 40px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 className="product-title" style={{ fontSize: 22 }}>{t.allCategories}</h2>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {lang === "ru" ? "Показано" : "Нишон дода шуд"} {Math.min(visibleCount, products.length)} {lang === "ru" ? "из" : "аз"} {products.length}
          </span>
        </div>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          style={{
            padding: "8px 12px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            fontFamily: "var(--font-body)",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          <option value="">{t.sortDefault}</option>
          <option value="popularity">{t.sortPopularity}</option>
          <option value="price_asc">{t.sortPriceAsc}</option>
          <option value="price_desc">{t.sortPriceDesc}</option>
          <option value="newest">{t.sortNewest}</option>
          <option value="rating">{t.sortRating}</option>
          <option value="discount">{t.sortDiscount}</option>
        </select>
      </div>


        <div id="catalog-section" className="catalog-container" style={{ padding: "0 40px 40px" }}>
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
          {products.slice(0, visibleCount).map((p) => (
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
                    style={{ position: "absolute", top: -50, left: "50%", transform: "translateX(-50%)", width: 130, height: 130, objectFit: "contain", pointerEvents: "none" }}
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
                    const inStock = p.variants.filter((v) => v.stock > 0);
                    if (inStock.length === 0) return;
                    if (inStock.length === 1) {
                      const v = inStock[0];
                      cart.addItem({
                        variantId: v.id,
                        productId: p.id,
                        title: localized(p.title_ru, p.title_tj),
                        catalogNumber: p.catalog_number,
                        price: p.price,
                        size: v.size,
                        color: v.color,
                      }).then((res) => {
                        setToastType(res.ok ? "success" : "error");
                        setToastMessage(res.ok ? (lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд") : (res.error || (lang === "ru" ? "Не удалось добавить" : "Илова нашуд")));
                        setTimeout(() => setToastMessage(null), 3000);
                      });
                      return;
                    }
                    setQuickAddSize("");
                    setQuickAddProductId(quickAddProductId === p.id ? null : p.id);
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
                    cursor: p.variants.some((v) => v.stock > 0) ? "pointer" : "not-allowed",
                    opacity: p.variants.some((v) => v.stock > 0) ? 1 : 0.4,
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
                {quickAddProductId === p.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute",
                      bottom: 8,
                      left: 8,
                      right: 8,
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      padding: 10,
                      zIndex: 5,
                    }}
                  >
                    {!quickAddSize ? (
                      <>
                        <div style={{ fontSize: 11, marginBottom: 6, color: "var(--text-muted)" }}>
                          {lang === "ru" ? "Выберите размер" : "Андозаро интихоб кунед"}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Array.from(new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))).map((s) => (
                            <span
                              key={s}
                              onClick={() => setQuickAddSize(s)}
                              style={{ padding: "4px 8px", border: "1px solid var(--line)", cursor: "pointer", fontSize: 12, background: "var(--surface)" }}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 11, marginBottom: 6, color: "var(--text-muted)" }}>
                          {lang === "ru" ? "Выберите цвет" : "Рангро интихоб кунед"}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.variants.filter((v) => v.stock > 0 && v.size === quickAddSize).map((v) => (
                            <span
                              key={v.id}
                              onClick={() => {
                                cart.addItem({
                                  variantId: v.id,
                                  productId: p.id,
                                  title: localized(p.title_ru, p.title_tj),
                                  catalogNumber: p.catalog_number,
                                  price: p.price,
                                  size: v.size,
                                  color: v.color,
                                }).then((res) => {
                                  setToastType(res.ok ? "success" : "error");
                                  setToastMessage(res.ok ? (lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд") : (res.error || (lang === "ru" ? "Не удалось добавить" : "Илова нашуд")));
                                  setTimeout(() => setToastMessage(null), 3000);
                                });
                                setQuickAddProductId(null);
                              }}
                              title={v.color}
                              style={{
                                width: 22,
                                height: 22,
                                borderRadius: "50%",
                                background: filterOptions.colors.find((c) => c.name === v.color)?.hex || "#999999",
                                cursor: "pointer",
                                display: "inline-block",
                                boxShadow: "0 0 0 1px var(--line)",
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
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
                  color: p.variants.reduce((sum, v) => sum + v.stock, 0) === 0 ? "#E24B4A" : p.variants.reduce((sum, v) => sum + v.stock, 0) <= 5 ? "#E8A33D" : "#4CAF50",
                  marginBottom: 8,
                }}
              >
                {(() => {
                  const totalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
                  if (totalStock === 0) return lang === "ru" ? "Нет в наличии" : "Мавҷуд нест";
                  if (totalStock <= 5) return lang === "ru" ? `Осталось ${totalStock} шт` : `${totalStock} дона монд`;
                  return lang === "ru" ? "Есть в наличии" : "Мавҷуд ҳаст";
                })()}
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
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                <span>🚚</span>
                <span>{city === "dushanbe" ? (lang === "ru" ? "Завтра" : "Пагоҳ") : (lang === "ru" ? "В регион" : "Ба минтақа")}</span>
              </div>
              <StarRating avgRating={p.avg_rating} reviewCount={p.review_count} />
            </div>
          ))}
        </div>
        <div ref={loadMoreRef} style={{ height: 1 }} />
      </div>

      {cartOpen && (
        <div
          onClick={() => setCartOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            overflow: "hidden",
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
              overflowY: "auto",
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
                      <span className="product-title" style={{ fontSize: 16 }}>{t.cartTotal}</span>
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
                      {t.cartCheckoutButton}
                    </button>
                  </div>
                )}
              </>
            )}

            {checkoutStep === "form" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: -6 }}>
                  {t.checkoutRequiredNote}
                </div>
                <div>
                  <input
                    placeholder={`${t.checkoutName} *`}
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    style={{ width: "100%", padding: 12, background: "var(--surface)", border: attemptedSubmit && !customerName ? "1px solid #E24B4A" : "1px solid var(--line)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }}
                  />
                  {attemptedSubmit && !customerName && (
                    <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>
                  )}
                </div>
                <div>
                  <input
                    placeholder="Телефон (+992ХХХХХХХХХ или 900ХХХХХХ) *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    style={{ width: "100%", padding: 12, background: "var(--surface)", border: (customerPhone && !isValidPhone(customerPhone)) || (attemptedSubmit && !customerPhone) ? "1px solid #E24B4A" : "1px solid var(--line)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }}
                  />
                  {customerPhone && !isValidPhone(customerPhone) && (
                    <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>
                      {lang === "ru" ? "Формат: +992ХХХХХХХХХ или 900ХХХХХХ" : "Формат: +992ХХХХХХХХХ ё 900ХХХХХХ"}
                    </div>
                  )}
                  {attemptedSubmit && !customerPhone && (
                    <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>
                  )}
                </div>
                <div>
                  <input
                    placeholder={`${t.checkoutAddress} *`}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    style={{ width: "100%", padding: 12, background: "var(--surface)", border: attemptedSubmit && !deliveryAddress ? "1px solid #E24B4A" : "1px solid var(--line)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }}
                  />
                  {attemptedSubmit && !deliveryAddress && (
                    <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>
                  )}
                </div>
                <div>
                  <input
                    placeholder={`${t.checkoutLandmark} *`}
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    style={{ width: "100%", padding: 12, background: "var(--surface)", border: attemptedSubmit && !landmark ? "1px solid #E24B4A" : "1px solid var(--line)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }}
                  />
                  {attemptedSubmit && !landmark && (
                    <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>
                  )}
                </div>
                <textarea
                  placeholder={t.checkoutCommentPlaceholder}
                  value={orderComment}
                  onChange={(e) => setOrderComment(e.target.value)}
                  rows={3}
                  style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14, resize: "none" }}
                />

                <div>
                  <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 10 }}>
                    {t.checkoutPaymentMethod}
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
                      {t.checkoutCardLoginRequired.split(" ")[0]} {!auth.customer && `(${lang === "ru" ? "войдите" : "даромадан"})`}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placing}
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
                    {placing ? t.checkoutPlacing : t.checkoutConfirmOrder}
                  </button>
                  <span
                    onClick={() => setCheckoutStep("cart")}
                    style={{ textAlign: "center", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}
                  >
                    {t.checkoutBackToCart}
                  </span>
                </div>
              </div>
            )}
            {checkoutStep === "payment" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20 }}>
                <span className="product-title" style={{ fontSize: 18 }}>{t.checkoutOrderCreated.replace("{id}", String(orderNumber))}</span>

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
                      {t.checkoutQrMock}
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 260 }}>
                      {t.checkoutScanQr.replace("{amount}", String(cart.totalPrice))}
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
                  {t.checkoutPaidMock}
                </button>
              </div>
            )}

            {checkoutStep === "done" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16 }}>
                <span className="product-title" style={{ fontSize: 20 }}>{t.checkoutThankYou}</span>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  {t.checkoutOrderAccepted.replace("{id}", String(orderNumber)).replace("{phone}", customerPhone)}
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
                  {t.checkoutClose}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {authOpen && (
        <div
          onClick={handleCloseAuth}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span className="product-title" style={{ fontSize: 20 }}>
                {authMode === "login" ? (lang === "ru" ? "Вход" : "Даромадан") : authMode === "register" ? (lang === "ru" ? "Регистрация" : "Бақайдгирӣ") : (lang === "ru" ? "Восстановление пароля" : "Барқарор кардани парол")}
              </span>
              <span onClick={handleCloseAuth} style={{ cursor: "pointer", fontSize: 20, color: "var(--text-muted)" }}>×</span>
            </div>

            <form onSubmit={(e) => e.preventDefault()} autoComplete="off" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {authMode === "reset" ? (
              <>
                {resetStep === "phone" ? (
                  <>
                    <input
                      key="reset-phone-input"
                      autoComplete="off"
                      placeholder={lang === "ru" ? "Телефон" : "Телефон"}
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                    />
                    <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
                      {lang === "ru"
                        ? "Напишите нашему боту @Oina_help_bot команду /resetpass и введите этот же номер телефона — бот пришлёт код."
                        : "Ба боти мо @Oina_help_bot фармони /resetpass нависед ва ҳамин рақами телефонро ворид кунед — бот рамзро мефиристад."}
                    </p>
                    <button
                      onClick={() => setResetStep("code")}
                      style={{ padding: "14px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      {lang === "ru" ? "У меня есть код" : "Ман рамз дорам"}
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {lang === "ru" ? "Телефон: " : "Телефон: "}{authPhone}
                    </p>
                    <input
                      key="reset-code-input"
                      autoComplete="off"
                      name="oina-reset-otp-code"
                      inputMode="numeric"
                      placeholder={lang === "ru" ? "6-значный код из Telegram" : "Рамзи 6-рақамӣ аз Telegram"}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResetVerify()}
                      style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={lang === "ru" ? "Новый пароль" : "Пароли нав"}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResetVerify()}
                      style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                    />
                    {authError && <span style={{ color: "#c0504d", fontSize: 13 }}>{authError}</span>}
                    {resetSuccess && <span style={{ color: "#4CAF50", fontSize: 13 }}>{resetSuccess}</span>}
                    <button
                      onClick={handleResetVerify}
                      style={{ padding: "14px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      {lang === "ru" ? "Сменить пароль" : "Иваз кардани парол"}
                    </button>
                  </>
                )}
                <span
                  onClick={() => { setAuthMode("login"); setResetStep("phone"); setAuthError(""); setResetSuccess(""); }}
                  style={{ textAlign: "center", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}
                >
                  {lang === "ru" ? "← Назад ко входу" : "← Ба воридшавӣ"}
                </span>
              </>
            ) : (
              <>
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
                  onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
                  style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
                />
                <input
                  type="password"
                  autoComplete={authMode === "login" ? "current-password" : "new-password"}
                  placeholder={lang === "ru" ? "Пароль" : "Парол"}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
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

                {authMode === "login" && (
                  <span
                    onClick={() => { setAuthMode("reset"); setAuthError(""); }}
                    style={{ textAlign: "center", cursor: "pointer", fontSize: 12, color: "var(--text-muted)", textDecoration: "underline" }}
                  >
                    {lang === "ru" ? "Забыли пароль?" : "Паролро фаромӯш кардед?"}
                  </span>
                )}

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
              </>
            )}
          </form>
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
      {homepageReviews.length > 0 && (
        <div style={{ padding: "24px 40px" }}>
          <h2 className="product-title" style={{ fontSize: 22, marginBottom: 14 }}>
            {lang === "ru" ? "Отзывы покупателей" : "Назари мизоҷон"}
          </h2>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            {homepageReviews.map((r) => (
              <div
                key={r.id}
                onClick={() => router.push(`/product/${r.product_id}`)}
                style={{
                  minWidth: 260,
                  maxWidth: 260,
                  flexShrink: 0,
                  border: "1px solid var(--line)",
                  borderRadius: 12,
                  padding: 14,
                  cursor: "pointer",
                  background: "var(--surface)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  {r.product_image && (
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundImage: `url(${r.product_image})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {localized(r.product_title_ru, r.product_title_tj)}
                    </div>
                    <div style={{ display: "flex", gap: 1 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} style={{ fontSize: 11, color: r.rating >= n ? "var(--accent)" : "var(--line)" }}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 8, color: "var(--text)" }}>
                  {r.comment}
                </p>
                {r.customer_name && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>— {r.customer_name}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <Footer lang={lang} />
    </div>
  );
}
function AutoSlideImage({ images, onClick }: { images: { url: string; media_type?: string }[]; onClick: () => void }) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [images.length]);

  const current = images[index];
  const isVideo = current?.media_type === "video";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {isVideo ? (
        <video
          key={current.url}
          src={current.url}
          autoPlay
          muted={muted}
          loop
          playsInline
          onClick={onClick}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", cursor: "pointer" }}
        />
      ) : (
        <div
          onClick={onClick}
          style={{
            position: "absolute",
            inset: 0,
            cursor: "pointer",
            backgroundImage: current ? `url(${current.url})` : "none",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            transition: "background-image 0.3s ease",
          }}
        />
      )}
      {isVideo && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setMuted((m) => !m);
          }}
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          <span style={{ fontSize: 12 }}>{muted ? "🔇" : "🔊"}</span>
        </span>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function BannerSlider({ banners, router }: { banners: Banner[]; router: any }) {
  const [index, setIndex] = useState(0);
  const active = banners.filter((b) => b.image_url);

  useEffect(() => {
    if (active.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % active.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [active.length]);

  if (active.length === 0) return null;

  const current = active[index % active.length];

  return (
    <div className="banner-wrapper" style={{ padding: "24px 40px 0" }}>
    <div className="banner-slider" style={{ position: "relative", width: "100%", height: 380, overflow: "hidden", borderRadius: 8 }}>
      {active.map((b, i) => (
        <div
          key={b.id}
          className="banner-slide-bg"
          onClick={() => router.push(`/?category=${b.category_id}`)}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${b.image_url})`,
            backgroundSize: "cover",
            backgroundPosition: "top center",
            cursor: "pointer",
            opacity: i === index % active.length ? 1 : 0,
            pointerEvents: i === index % active.length ? "auto" : "none",
            transition: "opacity 0.6s ease",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.05) 50%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "32px 40px",
            }}
          >
            <h2 className="product-title" style={{ color: b.text_color || "#fff", fontSize: 32, margin: 0 }}>{b.title}</h2>
            {b.subtitle && <p style={{ color: b.text_color || "#fff", opacity: 0.85, fontSize: 15, marginTop: 8 }}>{b.subtitle}</p>}
          </div>
        </div>
      ))}
      {active.length > 1 && (
        <>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i - 1 + active.length) % active.length);
            }}
            style={{ position: "absolute", top: "50%", left: 16, transform: "translateY(-50%)", fontSize: 32, color: "#fff", cursor: "pointer", userSelect: "none", zIndex: 2, textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1 }}
          >
            ‹
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % active.length);
            }}
            style={{ position: "absolute", top: "50%", right: 16, transform: "translateY(-50%)", fontSize: 32, color: "#fff", cursor: "pointer", userSelect: "none", zIndex: 2, textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1 }}
          >
            ›
          </span>
        <div style={{ position: "absolute", bottom: 16, right: 40, display: "flex", gap: 8, zIndex: 2 }}>
          {active.map((_, i) => (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: i === index % active.length ? "#fff" : "rgba(255,255,255,0.4)",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        </>
      )}
    </div>
    </div>
  );
}
