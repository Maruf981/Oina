"use client";
import { cld } from "../lib/cld";
import { DualSlider, type DualSlide } from "./dual-slider";

import { Fragment, useEffect, useState, useRef, Suspense } from "react";
import Image from "next/image";
import { translations, Lang } from "./translations";
import { useCart } from "./cart-context";
import { useCategories } from "./categories-context";
import { SiteHeader } from "./site-header";
import "./hero.css";
import "./product-card.css";
import { CATEGORY_ICONS } from "./category-icons";
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
  icon?: string | null;
  parent_id: number | null;
};

function SortDropdown({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: "relative", minWidth: 190 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          height: 40,
          padding: "0 12px",
          background: "var(--surface)",
          color: "var(--text)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          fontFamily: "var(--font-body)",
          fontSize: 13,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span>{current?.label}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          style={{ flexShrink: 0, opacity: 0.7, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.18s ease" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "100%",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 8,
            boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
            padding: 4,
            zIndex: 200,
            overflow: "hidden",
          }}
        >
          {options.map((o) => {
            const active = o.value === value;
            return (
              <div
                key={o.value || "default"}
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 6,
                  fontSize: 13,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  color: active ? "var(--accent)" : "var(--text)",
                  background: active ? "var(--bg)" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.background = "var(--bg)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent";
                }}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 9 || (digits.length === 12 && digits.startsWith("992"));
}


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
  category?: { id: number; name: string } | null;
  avg_rating: number | null;
  review_count: number;
  discount_percent: number | null;
  original_price: number | null;
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
                stroke="#fff"
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
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(() => {
    const v = searchParams.get("category_id");
    return v ? Number(v) : null;
  });
  const [openMegaMenu, setOpenMegaMenu] = useState<number | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [dualSlides, setDualSlides] = useState<DualSlide[]>([]);
  useEffect(() => {
    fetch(`${API_URL}/dual-slides/`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setDualSlides(Array.isArray(d) ? d : []))
      .catch(() => setDualSlides([]));
  }, []);
  useEffect(() => {
    fetch(`${API_URL}/banners/`)
      .then((r) => r.json())
      .then(setBanners)
      .catch(() => setBanners([]));
  }, []);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [homepageReviews, setHomepageReviews] = useState<HomepageReview[]>([]);
  const [recommendedCollapsed, setRecommendedCollapsed] = useState(false);
  const [recommendedProgress, setRecommendedProgress] = useState(0);
  const recommendedScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingRecommended, setIsDraggingRecommended] = useState(false);
  const [quickAddCtx, setQuickAddCtx] = useState("grid");
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const [visibleCount, setVisibleCount] = useState(() => {
    try {
      const saved = sessionStorage.getItem("oina_catalog_visible_count");
      return saved ? parseInt(saved, 10) : 20;
    } catch {
      return 20;
    }
  });
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { theme, toggleTheme } = useTheme();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const { lang, toggleLang } = useLang();
  const { city, toggleCity } = useCity();
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

  useEffect(() => {
    const str = (key: string) => searchParams.get(key) || "";
    const bool = (key: string) => searchParams.get(key) === "true";
    setSearchQuery((prev) => (prev !== str("search") ? str("search") : prev));
    setMinPrice((prev) => (prev !== str("min_price") ? str("min_price") : prev));
    setMaxPrice((prev) => (prev !== str("max_price") ? str("max_price") : prev));
    setFilterSize((prev) => (prev !== str("size") ? str("size") : prev));
    setFilterColor((prev) => (prev !== str("color") ? str("color") : prev));
    setFilterMaterial((prev) => (prev !== str("material") ? str("material") : prev));
    setFilterSeason((prev) => (prev !== str("season") ? str("season") : prev));
    setSortOption((prev) => (prev !== str("sort") ? str("sort") : prev));
    setFilterBrandOnly((prev) => (prev !== bool("brand_only") ? bool("brand_only") : prev));
    setFilterInStock((prev) => (prev !== bool("in_stock_only") ? bool("in_stock_only") : prev));
    setFilterOnSale((prev) => (prev !== bool("on_sale_only") ? bool("on_sale_only") : prev));
    const catRaw = searchParams.get("category_id") || searchParams.get("category");
    const catNum = catRaw ? Number(catRaw) : null;
    setSelectedCategoryId((prev) => (prev !== catNum ? catNum : prev));
  }, [searchParams]);
  const t = translations[lang];
  const cart = useCart();
  const auth = useAuth();
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const handleCloseAuth = () => {
    setAuthOpen(false);
    if (searchParams.get("login") === "1") {
      router.replace("/");
    }
  };
  useEffect(() => {
    setAuthOpen(searchParams.get("login") === "1" && !auth.customer);
  }, [searchParams, auth.customer]);
  useEffect(() => {
    if (auth.customer && searchParams.get("login") === "1") {
      router.replace("/");
    }
  }, [auth.customer, searchParams]);
  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      setSelectedCategoryId(Number(catParam));
      setTimeout(() => {
        document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [searchParams]);
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
  const [favHydrated, setFavHydrated] = useState(false);
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
  setFavHydrated(true);
  }, []);

  useEffect(() => {
    if (!favHydrated) return;
    if (!auth.token) {
      localStorage.setItem("guest_favorites", JSON.stringify(Array.from(favoriteIds)));
    }
  }, [favoriteIds, auth.token, favHydrated]);

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
    if (authMode === "register" && !isValidPhone(authPhone)) {
      setAuthError(lang === "ru" ? "Номер должен содержать 9 цифр" : "Рақам бояд 9 рақам дошта бошад");
      return;
    }
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
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("already registered")) {
        setAuthError(lang === "ru" ? "Этот номер уже зарегистрирован — войдите" : "Ин рақам аллакай бақайд гирифта шудааст — ворид шавед");
      } else {
        setAuthError(lang === "ru" ? "Неверный телефон или пароль" : "Телефон ё парол нодуруст");
      }
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
        "search", "min_price", "max_price", "size", "color", "category_id", "category",
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
      setProductsLoading(true);
      setProductsError(false);
      fetch(`${API_URL}/products/?${params.toString()}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setProducts(data);
          setVisibleCount(20);
          setProductsLoading(false);
        })
        .catch((err) => {
          if (err.name !== "AbortError") {
            setProducts([]);
            setProductsError(true);
            setProductsLoading(false);
          }
        });
    }, 350);
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [searchQuery, minPrice, maxPrice, filterSize, filterColor, selectedCategoryId, searchParams, sortOption, filterMaterial, filterSeason, filterBrandOnly, filterInStock, filterOnSale, filterRecommendedOnly, retryTrigger]);

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

  const visibleCountRef = useRef(visibleCount);
  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);
  useEffect(() => {
    const handleScroll = () => {
      try {
        sessionStorage.setItem("oina_catalog_scroll_y", String(window.scrollY));
        sessionStorage.setItem("oina_catalog_visible_count", String(visibleCountRef.current));
      } catch {}
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const scrollRestoredRef = useRef(false);
  useEffect(() => {
    if (scrollRestoredRef.current) return;
    if (productsLoading) return;
    if (products.length === 0) return;
    try {
      const savedY = sessionStorage.getItem("oina_catalog_scroll_y");
      if (savedY) {
        window.scrollTo({ top: parseInt(savedY, 10), behavior: "auto" });
      }
    } catch {}
    scrollRestoredRef.current = true;
  }, [productsLoading, products]);

  const renderCard = (p: Product, ctx: string) => {
    const inStock = p.variants.filter((v) => v.stock > 0);
    const out = inStock.length === 0;
    const badge = out
      ? (lang === "ru" ? "Нет в наличии" : "Мавҷуд нест")
      : isDiscountActive(p) && p.discount_percent
      ? `−${p.discount_percent}%`
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
        price: p.price,
        size: v.size,
        color: v.color,
      }).then((res) => {
        setToastType(res.ok ? "success" : "error");
        setToastMessage(res.ok ? (lang === "ru" ? "Добавлено в корзину" : "Ба сабад илова шуд") : (res.error || (lang === "ru" ? "Не удалось добавить" : "Илова нашуд")));
        setTimeout(() => setToastMessage(null), 3000);
      });
    };
    return (
      <div key={quickKey} className="pc">
        <div className="pc-media" onClick={() => router.push(`/product/${p.id}`)}>
          <CardMedia images={p.images} alt={localized(p.title_ru, p.title_tj)} />
          {badge && <span className="pc-badge">{badge}</span>}
          {p.avg_rating && p.review_count > 0 ? (
            <span className="pc-rating" title={`${p.avg_rating.toFixed(1)} / 5 · ${p.review_count}`}>
              <span className="pc-stars">
                <span className="pc-stars-row pc-stars-base">{[0, 1, 2, 3, 4].map((i) => <span key={i}><svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17.3l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" /></svg></span>)}</span>
                <span className="pc-stars-row pc-stars-fill" style={{ width: `${(Math.max(0, Math.min(5, p.avg_rating)) / 5) * 100}%`, "--pc-fill": `${(Math.max(0, Math.min(5, p.avg_rating)) / 5) * 100}%` } as React.CSSProperties}>{[0, 1, 2, 3, 4].map((i) => <span key={i}><svg viewBox="0 0 24 24"><path d="M12 2.8l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17.3l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z" /></svg></span>)}</span>
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
                        style={{ background: filterOptions.colors.find((c) => c.name === v.color)?.hex || "#999999" }}
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
              toggleFavorite(p.id);
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
            {p.price} смн
            {isDiscountActive(p) && (
              <s>{Math.round(p.original_price ?? (p.price / (1 - (p.discount_percent as number) / 100)))} смн</s>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div data-theme={theme} className="home-root" style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <SiteHeader />



      <HeroSlider banners={banners} />
      <CollectionBar selectedCategoryId={selectedCategoryId} router={router} />

      {recommendedProducts.length > 0 && (
        <section className="pc-wrap sec">
          <div className="sec-head">
            <span className="coll-rule" />
            <h2 className="sec-title">{t.recommended}</h2>
            <span className="sec-link" onClick={() => router.push("/?recommended=1")}>{t.seeAll}</span>
          </div>
          <div className="rec-row">
            <button className="rec-arrow rec-arrow--left" aria-label="←" onClick={() => recommendedScrollRef.current?.scrollBy({ left: -(recommendedScrollRef.current.clientWidth * 0.75) })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M15 4 L7 12 L15 20" /></svg>
            </button>
            <div ref={recommendedScrollRef} className="rec-scroll">
              {recommendedProducts.map((p) => (
                <div key={p.id} className="rec-item">{renderCard(p, "rec")}</div>
              ))}
            </div>
            <button className="rec-arrow rec-arrow--right" aria-label="→" onClick={() => recommendedScrollRef.current?.scrollBy({ left: recommendedScrollRef.current.clientWidth * 0.75 })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M9 4 L17 12 L9 20" /></svg>
            </button>
          </div>
        </section>
      )}

      <div className="sec-head">
        <span className="coll-rule" />
        <h2 className="sec-title">{lang === "ru" ? "Все товары" : "Ҳамаи молҳо"}</h2>
        <span className="sec-count">
          {lang === "ru" ? "Показано" : "Нишон дода шуд"} {Math.min(visibleCount, products.length)} {lang === "ru" ? "из" : "аз"} {products.length}
        </span>
        <nav className="sec-sort">
          {[
              { value: "", label: t.sortDefault },
              { value: "popularity", label: t.sortPopularity },
              { value: "price_asc", label: t.sortPriceAsc },
              { value: "price_desc", label: t.sortPriceDesc },
              { value: "newest", label: t.sortNewest },
              { value: "rating", label: t.sortRating },
              { value: "discount", label: t.sortDiscount },
            ].map((o) => (
            <span key={o.value} className={`coll-item${sortOption === o.value ? " is-active" : ""}`} onClick={() => setSortOption(o.value)}>
              {o.label}
            </span>
          ))}
        </nav>
      </div>



        <div id="catalog-section" className="catalog-container pc-wrap">
        <div
          className="pc-grid"
        >
          {productsLoading && (
            Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
          )}
          {!productsLoading && productsError && (
            <div style={{ padding: 40, background: "var(--bg)", color: "var(--text-muted)", textAlign: "center" }}>
              <p style={{ marginBottom: 14 }}>{lang === "ru" ? "Не удалось загрузить товары. Проверьте соединение." : "Боргирии молҳо муяссар нашуд. Пайвастшавиро тафтиш кунед."}</p>
              <button
                onClick={() => setRetryTrigger((v) => v + 1)}
                style={{ padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
              >
                {lang === "ru" ? "Повторить" : "Такрор кардан"}
              </button>
            </div>
          )}
          {!productsLoading && !productsError && products.length === 0 && (
            <div style={{ padding: 40, background: "var(--bg)", color: "var(--text-muted)" }}>
              {t.noProducts}
            </div>
          )}
          {!productsLoading && !productsError && [...products].sort((a, b) => {
            const stock = (x: typeof a) => (x.variants ? x.variants.reduce((sum, v) => sum + (v.stock || 0), 0) : 0);
            return Number(stock(a) === 0) - Number(stock(b) === 0);
          }).slice(0, visibleCount).map((p, idx) => (
            <Fragment key={p.id}>
            
            {renderCard(p, "grid")}
            {idx === Math.min(24, products.length) - 1 && dualSlides.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="sec-head" style={{ paddingBottom: "1rem" }}>
                  <span className="coll-rule" />
                  <h2 className="sec-title">{lang === "ru" ? "Стиль в деталях" : "Услуб дар ҷузъиёт"}</h2>
                  <span className="sec-link" onClick={() => document.getElementById("catalog-section")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{lang === "ru" ? "Смотреть коллекцию →" : "Дидани коллексия →"}</span>
                </div>
                <DualSlider slides={dualSlides} router={router} lang={lang} />
              </div>
            )}
            </Fragment>
          ))}
        </div>
        <div ref={loadMoreRef} style={{ height: 1 }} />
      </div>

      {authOpen && (
        <div className="au-bg" onClick={handleCloseAuth}>
          <div className="au" onClick={(e) => e.stopPropagation()}>
            <button className="au-close oh-action" onClick={handleCloseAuth}>{lang === "ru" ? "Закрыть" : "Пӯшидан"} ×</button>

            <div className="au-head">
              <span className="coll-rule" />
              <div className="ck-eyebrow">{lang === "ru" ? "Личный кабинет" : "Утоқи шахсӣ"}</div>
              <h2 className="au-title">
                {authMode === "login" ? (lang === "ru" ? "Вход" : "Даромадан") : authMode === "register" ? (lang === "ru" ? "Регистрация" : "Бақайдгирӣ") : (lang === "ru" ? "Восстановление пароля" : "Барқарор кардани парол")}
              </h2>
              <p className="au-lead">
                {authMode === "reset"
                  ? (lang === "ru" ? "Мы поможем вернуть доступ к вашему аккаунту." : "Мо ба барқарор кардани дастрасӣ кӯмак мекунем.")
                  : (lang === "ru" ? "Авторизуйтесь, чтобы управлять своими данными, заказами и избранным." : "Барои идора кардани маълумот, фармоишҳо ва интихобҳо ворид шавед.")}
              </p>
              {authMode !== "reset" && (
                <nav className="au-tabs">
                  <span className={`coll-item${authMode === "login" ? " is-active" : ""}`} onClick={() => { setAuthMode("login"); setAuthError(""); }}>
                    {lang === "ru" ? "Вход" : "Даромадан"}
                  </span>
                  <span className={`coll-item${authMode === "register" ? " is-active" : ""}`} onClick={() => { setAuthMode("register"); setAuthError(""); }}>
                    {lang === "ru" ? "Регистрация" : "Бақайдгирӣ"}
                  </span>
                </nav>
              )}
            </div>

            <form onSubmit={(e) => e.preventDefault()} autoComplete="off" className="au-form">
              {authMode === "reset" ? (
                <>
                  {resetStep === "phone" ? (
                    <>
                      <label className="ck-field">
                        <span className="ck-field-label">{lang === "ru" ? "Телефон" : "Телефон"}</span>
                        <input key="reset-phone-input" autoComplete="off" value={authPhone} onChange={(e) => { setAuthPhone(e.target.value); setAuthError(""); }} />
                      </label>
                      <p className="ck-note">
                        {lang === "ru"
                          ? "Напишите нашему боту @Oina_help_bot команду /resetpass и введите этот же номер телефона — бот пришлёт код."
                          : "Ба боти мо @Oina_help_bot фармони /resetpass нависед ва ҳамин рақами телефонро ворид кунед — бот рамзро мефиристад."}
                      </p>
                      <button className="ck-btn" onClick={() => setResetStep("code")}>{lang === "ru" ? "У меня есть код" : "Ман рамз дорам"}</button>
                    </>
                  ) : (
                    <>
                      <p className="ck-note">{lang === "ru" ? "Телефон: " : "Телефон: "}{authPhone}</p>
                      <label className="ck-field">
                        <span className="ck-field-label">{lang === "ru" ? "Код из Telegram" : "Рамз аз Telegram"}</span>
                        <input key="reset-code-input" autoComplete="off" name="oina-reset-otp-code" inputMode="numeric" placeholder="000000"
                          value={resetCode} onChange={(e) => setResetCode(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleResetVerify()} />
                      </label>
                      <label className="ck-field">
                        <span className="ck-field-label">{lang === "ru" ? "Новый пароль" : "Пароли нав"}</span>
                        <input type="password" autoComplete="new-password" value={resetNewPassword}
                          onChange={(e) => setResetNewPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleResetVerify()} />
                      </label>
                      {authError && <span className="ck-error au-msg">{authError}</span>}
                      {resetSuccess && <span className="au-msg au-ok">{resetSuccess}</span>}
                      <button className="ck-btn" onClick={handleResetVerify}>{lang === "ru" ? "Сменить пароль" : "Иваз кардани парол"}</button>
                    </>
                  )}
                  <span className="ck-link ck-link--muted au-center" onClick={() => { setAuthMode("login"); setResetStep("phone"); setAuthError(""); setResetSuccess(""); }}>
                    {lang === "ru" ? "← Назад ко входу" : "← Ба воридшавӣ"}
                  </span>
                </>
              ) : (
                <>
                  {authMode === "register" && (
                    <label className="ck-field">
                      <span className="ck-field-label">{lang === "ru" ? "Имя" : "Ном"}</span>
                      <input value={authName} onChange={(e) => setAuthName(e.target.value)} />
                    </label>
                  )}

                  <label className={`ck-field${authPhone && !isValidPhone(authPhone) ? " has-error" : ""}`}>
                    <span className="ck-field-label">{lang === "ru" ? "Номер телефона" : "Рақами телефон"}</span>
                    <span className="au-input-row">
                      <span className="au-prefix">+992</span>
                      <input placeholder="900796328" value={authPhone} onChange={(e) => setAuthPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()} />
                    </span>
                    {authPhone && !isValidPhone(authPhone) && (
                      <span className="ck-error">{lang === "ru" ? "Нужно 9 цифр, например 900796328" : "9 рақам лозим аст, мисол 900796328"}</span>
                    )}
                  </label>

                  <label className="ck-field">
                    <span className="ck-field-label">{lang === "ru" ? "Пароль" : "Парол"}</span>
                    <span className="au-input-row">
                      <input
                        type={showAuthPassword ? "text" : "password"}
                        autoComplete={authMode === "login" ? "current-password" : "new-password"}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
                      />
                      <span className="au-eye" onClick={(e) => { e.preventDefault(); setShowAuthPassword((v) => !v); }}>
                        {showAuthPassword ? (lang === "ru" ? "Скрыть" : "Пинҳон") : (lang === "ru" ? "Показать" : "Нишон")}
                      </span>
                    </span>
                  </label>

                  {authMode === "login" && (
                    <span className="ck-link ck-link--muted au-forgot" onClick={() => { setAuthMode("reset"); setAuthError(""); }}>
                      {lang === "ru" ? "Забыли пароль?" : "Паролро фаромӯш кардед?"}
                    </span>
                  )}

                  {authError && <span className="ck-error au-msg">{authError}</span>}

                  <button className="ck-btn" onClick={handleAuthSubmit}>
                    {authMode === "login" ? (lang === "ru" ? "Войти" : "Даромадан") : (lang === "ru" ? "Зарегистрироваться" : "Бақайд гирифтан")}
                  </button>

                  <p className="ck-note ck-note--center au-switch">
                    {authMode === "login" ? (lang === "ru" ? "Нет аккаунта? " : "Ҳисоб надоред? ") : (lang === "ru" ? "Уже есть аккаунт? " : "Ҳисоб доред? ")}
                    <span className="ck-link" onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }}>
                      {authMode === "login" ? (lang === "ru" ? "Зарегистрироваться" : "Бақайд гиред") : (lang === "ru" ? "Войти" : "Ворид шавед")}
                    </span>
                  </p>
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
        <section className="pc-wrap sec sec--reviews">
          <div className="sec-head">
            <span className="coll-rule" />
            <h2 className="sec-title">{lang === "ru" ? "Отзывы покупателей" : "Назари мизоҷон"}</h2>
          </div>
          <div className="rv-scroll">
            {homepageReviews.map((r) => (
              <div key={r.id} className="rv" onClick={() => router.push(`/product/${r.product_id}`)}>
                <div className="rv-top">
                  {r.product_image && <div className="rv-img" style={{ backgroundImage: `url(${cld(r.product_image, 300)})` }} />}
                  <div className="rv-meta">
                    <div className="rv-product">{localized(r.product_title_ru, r.product_title_tj)}</div>
                    <div className="rv-stars">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className={r.rating >= n ? "is-on" : ""}>★</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="rv-text">{r.comment}</p>
                {r.customer_name && <div className="rv-name">— {r.customer_name}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
      <Footer lang={lang} />
    </div>
  );
}
function SkeletonCard() {
  return (
    <div style={{ background: "var(--bg)", padding: 20 }}>
      <div style={{ position: "relative", aspectRatio: "3/4", background: "var(--surface)", border: "none", marginBottom: 14 }} />
      <div style={{ height: 17, width: "80%", background: "var(--surface)", marginBottom: 8 }} />
      <div style={{ height: 9, width: "40%", background: "var(--surface)", marginBottom: 8 }} />
      <div style={{ height: 12, width: "60%", background: "var(--surface)" }} />
    </div>
  );
}
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
            <video src={img.url} muted loop playsInline autoPlay={i === active} />
          ) : (
            <img src={cld(img.url, 800)} alt={alt} loading={i === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
          )}
        </div>
      ))}
    </div>
  );
}

function AutoSlideImage({ images, onClick, alt }: { images: { url: string; media_type?: string }[]; onClick: () => void; alt: string }) {
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
      ) : current ? (
        <Image
          key={current.url}
          src={current.url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1080px) 20vw, 17vw"
          style={{ objectFit: "contain", cursor: "pointer" }}
          onClick={onClick}
        />
      ) : null}
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

export default function HomeClient() {
  return (
    <Suspense fallback={null}>
      <HomeInner />
    </Suspense>
  );
}

function HeroSlider({ banners }: { banners: Banner[] }) {
  const { lang } = useLang();
  const [index, setIndex] = useState(0);
  const slides = banners.filter((b) => b.image_url);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 10000);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) return null;

  const current = index % slides.length;
  const isVideo = (url: string) => /\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(url);

  return (
    <section className="hero-full">
      {slides.map((b, i) => (
        <div key={b.id} className={`hero-slide${i === current ? " is-active" : ""}`} aria-hidden={i !== current}>
          {isVideo(b.image_url!) ? (
            <video src={b.image_url!} autoPlay muted loop playsInline preload="auto" />
          ) : (
            <img src={cld(b.image_url!, 2000)} alt="" />
          )}
        </div>
      ))}
      <div className="hero-shade" />

      <div className="hero-content">
        <div className="hero-texts">
          {slides.map((b, i) => (
            <div key={b.id} className={`hero-text${i === current ? " is-active" : ""}`}>
              {b.subtitle && <div className="hero-eyebrow">{b.subtitle}</div>}
              <h1 className="hero-title">{b.title}</h1>
            </div>
          ))}
        </div>
        <button className="hero-btn" onClick={() => window.dispatchEvent(new Event("oina:open-categories"))}>
          {lang === "ru" ? "Категории" : "Категорияҳо"}
        </button>
      </div>
      <div className="hero-foot">
        <span>Dushanbe</span>
        <span>Tajikistan</span>
      </div>
    </section>
  );
}

function CollectionBar({ selectedCategoryId, router }: { selectedCategoryId: number | null; router: any }) {
  const { categories } = useCategories();
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const subRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };
    window.addEventListener("oina:open-categories", onOpen);
    return () => window.removeEventListener("oina:open-categories", onOpen);
  }, []);

  useEffect(() => {
    const el = subRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  });

  if (!open && !selectedCategoryId) return null;

  const name = (c: { name: string; name_tj?: string | null }) => (lang === "tj" && c.name_tj ? c.name_tj : c.name);
  const parents = categories.filter((c) => !c.parent_id);
  const selected = categories.find((c) => c.id === selectedCategoryId) || null;
  const activeParentId = selected ? (selected.parent_id ?? selected.id) : null;
  const activeParent = categories.find((c) => c.id === activeParentId) || null;
  const children = activeParentId ? categories.filter((c) => c.parent_id === activeParentId) : [];
  const go = (id: number | null) => router.push(id ? `/?category_id=${id}` : "/", { scroll: false });

  return (
    <section ref={ref} className="coll">
      <div className="coll-head">
        <span className="coll-rule" />
        <div className="coll-eyebrow">{lang === "ru" ? "Коллекция" : "Коллексия"}</div>
        <h2 className="coll-title">
          {selected ? name(selected) : lang === "ru" ? "Все товары" : "Ҳамаи молҳо"}
        </h2>
        {activeParent && selected && selected.id !== activeParent.id && (
          <div className="coll-sub">{name(activeParent)}</div>
        )}
      </div>

      <nav className="coll-bar">
        <span className={`coll-item${!selectedCategoryId ? " is-active" : ""}`} onClick={() => { setOpen(false); go(null); }}>
          {lang === "ru" ? "Все" : "Ҳама"}
        </span>
        {parents.map((p) => (
          <span key={p.id} className={`coll-item${activeParentId === p.id ? " is-active" : ""}`} onClick={() => go(p.id)}>
            {name(p)}
          </span>
        ))}
      </nav>

      {children.length > 0 && (
        <nav ref={subRef} className="coll-bar coll-bar--sub">
          {children.map((c) => (
            <span key={c.id} className={`coll-item${selectedCategoryId === c.id ? " is-active" : ""}`} onClick={() => go(c.id)}>
              {name(c)}
            </span>
          ))}
        </nav>
      )}
    </section>
  );
}
