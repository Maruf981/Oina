"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import Image from "next/image";
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

const ICON_SVG_PROPS = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  style: { flexShrink: 0, opacity: 0.85 },
};

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  dress: (
    <svg {...ICON_SVG_PROPS}>
      <path d="M10 2a2 2 0 0 0 4 0" />
      <path d="M10 2 6 7l3 1.5-2 11.5h10l-2-11.5 3-1.5-4-5" />
      <path d="M7 8.5c3 1.2 7 1.2 10 0" />
    </svg>
  ),
  suit: (
    <svg {...ICON_SVG_PROPS}>
      <path d="M4 4l5-1 3 4 3-4 5 1v17H4V4z" />
      <path d="M9 3l3 8 3-8" />
      <path d="M12 11v10" />
      <path d="M7 16h3" />
      <path d="M14 16h3" />
    </svg>
  ),
  stroller: (
    <svg {...ICON_SVG_PROPS}>
      <circle cx="8" cy="20" r="2" />
      <circle cx="17" cy="20" r="2" />
      <path d="M18 16H6a2 2 0 0 1-2-2V9a5 5 0 0 1 5-5h1a5 5 0 0 1 5 5v3" />
      <path d="M15 11l4-7h2" />
    </svg>
  ),
  shoe: (
    <svg {...ICON_SVG_PROPS}>
      <path d="M2 17h20v-2.5a2 2 0 0 0-1-1.73l-6.5-3.77H11L7 13H3a1 1 0 0 0-1 1v3z" />
      <path d="M2 17v2a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-2" />
      <path d="M18 17v2a1 1 0 0 0 1 1h3v-3" />
    </svg>
  ),
  bag: (
    <svg {...ICON_SVG_PROPS}>
      <rect x="4" y="8" width="16" height="13" rx="2.5" />
      <path d="M8.5 8V5.5a3.5 3.5 0 0 1 7 0V8" />
      <circle cx="12" cy="12.5" r="0.75" fill="currentColor" />
    </svg>
  ),
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
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState(false);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [recommendedProducts, setRecommendedProducts] = useState<Product[]>([]);
  const [homepageReviews, setHomepageReviews] = useState<HomepageReview[]>([]);
  const [recommendedCollapsed, setRecommendedCollapsed] = useState(false);
  const [recommendedProgress, setRecommendedProgress] = useState(0);
  const recommendedScrollRef = useRef<HTMLDivElement>(null);
  const [isDraggingRecommended, setIsDraggingRecommended] = useState(false);
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  return (
    <div data-theme={theme} className="home-root" style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          borderBottom: "1px solid var(--header-border)",
          background: "var(--header-bg)", color: "var(--header-text)",
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
            flexWrap: "wrap",
            padding: "16px 40px",
            gap: 10,
            position: "relative",
          }}
        >
        {isMobile && (
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
          <span style={{ height: 2, background: "var(--header-text)" }} />
          <span style={{ height: 2, background: "var(--header-text)" }} />
          <span style={{ height: 2, background: "var(--header-text)" }} />
        </div>
        )}

        <span
          className="city-selector city-selector-hidden"
          onClick={toggleCity}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontFamily: "var(--font-label)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--header-text)",
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
          className="header-logo"
          src="/logo.png"
          alt="Oina.tj"
          onClick={() => router.push("/")}
          style={{ height: "clamp(28px, 8vw, 48px)", cursor: "pointer", flexShrink: 0 }}
        />

        <div className="header-search-slot" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: "100%", position: "relative" }} ref={searchContainerRef}>
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
                  borderBottom: "1px solid var(--header-line)",
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
              <line x1="3" y1="6" x2="17" y2="6" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
              <circle cx="12" cy="6" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
              <line x1="3" y1="14" x2="17" y2="14" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
              <circle cx="8" cy="14" r="2" fill="var(--bg)" stroke={filtersOpen ? "var(--accent)" : "var(--header-line)"} strokeWidth="1" />
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
                border: "none",
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
                    {(() => {
                      const thumb = p.images?.find((img) => img.media_type !== "video");
                      return thumb ? (
                        <img
                          src={thumb.url}
                          alt={p.title_ru}
                          style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                        />
                      ) : null;
                    })()}
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

        </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span
            onClick={toggleLang}
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-label)",
              fontSize: 12,
              letterSpacing: "0.05em",
              color: "var(--header-text)",
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
              border: "1px solid var(--header-text)",
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
                stroke="#fff"
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
            onClick={() => router.push("/cart")}
            style={{ cursor: "pointer", position: "relative", width: 26, height: 26, flexShrink: 0 }}
          >
            <svg width="26" height="26" viewBox="0 0 30 30">
              <path
                d="M8 13 C8 13 8 11 10 11 L20 11 C22 11 22 13 22 13 L21 25 C21 25.5 20.5 26 20 26 L10 26 C9.5 26 9 25.5 9 25 Z"
                fill="none"
                stroke="#fff"
                strokeWidth="1"
              />
              <path
                d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11"
                fill="none"
                stroke="#fff"
                strokeWidth="1"
              />
              <line x1="12" y1="16" x2="12" y2="21" stroke="#fff" strokeWidth="0.6" />
              <line x1="15" y1="16" x2="15" y2="21" stroke="#fff" strokeWidth="0.6" />
              <line x1="18" y1="16" x2="18" y2="21" stroke="#fff" strokeWidth="0.6" />
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
                  border: "none",
                }}
              />
            ) : (
              <svg width="21" height="21" viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="3.2" fill="none" stroke="var(--header-text)" strokeWidth="1" />
                <path d="M4 17 C4 13 6.5 11 10 11 C13.5 11 16 13 16 17" fill="none" stroke="var(--header-text)" strokeWidth="1" />
              </svg>
            )}
          </span>
        </div>
        </div>
      
      <div
        style={{
          borderTop: "1px solid var(--header-border)",
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "8px 12px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>🚚</span>{lang === "ru" ? "Доставка за 1 день" : "Дар 1 рӯз"}
        </span>
        <span className="trust-bar-secondary" style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>🔄</span>{lang === "ru" ? "Обмен 24ч" : "Иваз 24 соат"}
        </span>
        <span className="trust-bar-secondary" style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>↩️</span>{lang === "ru" ? "Бесплатный возврат" : "Баргардонии ройгон"}
        </span>
        <span style={{ fontSize: 11, color: "var(--header-text)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>💳</span>{lang === "ru" ? "Оплата картой/QR" : "Пардохт бо корт/QR"}
        </span>
      </div>
    </nav>


      {filtersOpen && (
        <div
          onClick={() => setFiltersOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 160,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="filters-drawer"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(360px, 88vw)",
              background: "var(--bg)",
              borderLeft: "1px solid var(--line)",
              padding: "20px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 14, letterSpacing: "0.04em", color: "var(--text)" }}>
                {lang === "ru" ? "Фильтры" : "Филтрҳо"}
              </span>
              <span
                onClick={() => setFiltersOpen(false)}
                style={{ cursor: "pointer", fontSize: 22, lineHeight: 1, color: "var(--text-muted)" }}
              >
                ×
              </span>
            </div>

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
                        border: "none",
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
                        border: "none",
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
                        border: "none",
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
                        border: "none",
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
                        border: "none",
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
          </div>
        </div>
      )}

      {isMobile && menuOpen && (
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
              padding: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderTopRightRadius: 16,
              borderBottomRightRadius: 16,
            }}
          >
            <div
              style={{
                background: "var(--header-bg)",
                color: "var(--header-text)",
                padding: "32px 20px", minHeight: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--header-border)",
                borderTopRightRadius: 16,
                marginBottom: 8,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.04em" }}>
                {t.categories}
              </span>
              <span
                onClick={() => setMenuOpen(false)}
                style={{ cursor: "pointer", fontSize: 20, lineHeight: 1, padding: "2px 6px" }}
              >
                ✕
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
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
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
                        {parent.icon && CATEGORY_ICONS[parent.icon]}
                        <span>{lang === "tj" && parent.name_tj ? parent.name_tj : parent.name}</span>
                      </span>
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
            <div
              style={{
                flexShrink: 0,
                borderTop: "1px solid var(--header-border)",
                background: "var(--header-bg)",
                color: "var(--header-text)",
                padding: "12px 20px",
                paddingBottom: "max(16px, env(safe-area-inset-bottom))",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {!auth.customer ? (
                <span
                  onClick={() => { setMenuOpen(false); router.push("/?login=1"); }}
                  style={{
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "var(--font-label)",
                    fontSize: 12,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    border: "1px solid var(--accent)",
                    borderRadius: 8,
                    padding: "11px 0",
                  }}
                >
                  {lang === "ru" ? "Авторизоваться" : "Даромадан"}
                </span>
              ) : (
                <span
                  onClick={() => { setMenuOpen(false); router.push("/account"); }}
                  style={{
                    cursor: "pointer",
                    textAlign: "center",
                    fontFamily: "var(--font-label)",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    color: "var(--header-text)",
                    border: "1px solid var(--header-border)",
                    borderRadius: 8,
                    padding: "11px 0",
                  }}
                >
                  {auth.customer.name || (lang === "ru" ? "Профиль" : "Уток")}
                </span>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <a href="https://t.me/oina_channel_tj" target="_blank" rel="noopener noreferrer" title="Telegram" style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#26A5E4" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M22 4.01L2.3 11.5c-1.3.5-1.3 1.2-.24 1.53l4.98 1.55L18.2 7.05c.5-.32.96-.14.58.2l-8.5 7.67l-.32 4.9c.47 0 .68-.22.93-.47l2.24-2.15 4.66 3.42c.86.47 1.48.23 1.7-.8L22.9 5.4c.32-1.25-.47-1.82-1.13-1.4z"/></svg></a>
                <a href="https://www.instagram.com/oina._tj" target="_blank" rel="noopener noreferrer" title="Instagram" style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "linear-gradient(45deg, #f09433, #dc2743, #bc1888)" }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.1" fill="#fff" stroke="none"/></svg></a>
                <a href="https://www.tiktok.com/@oina.tj" target="_blank" rel="noopener noreferrer" title="TikTok" style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "#000", border: "1px solid var(--header-border)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M16.6 5.82c-.86-.94-1.34-2.16-1.34-3.42h-3.06v13.9a3.1 3.1 0 01-3.1 3 3.1 3.1 0 01-3.1-3.1 3.1 3.1 0 013.1-3.1c.29 0 .57.04.84.11V9.98a6.2 6.2 0 00-.84-.06A6.17 6.17 0 003 16.1a6.17 6.17 0 006.1 6.17 6.17 6.17 0 006.1-6.17V9.68a8.36 8.36 0 004.8 1.53V8.15c-1.1 0-2.13-.35-2.98-.95a5.4 5.4 0 01-1.42-1.38z"/></svg></a>
                <a href="mailto:oina.tj.official@gmail.com" title="Email" style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: "var(--surface)", border: "1px solid var(--line)" }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg></a>
              </div>
              <div style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.04em", color: "var(--header-text)", opacity: 0.6 }}>
                {"\u00A9"} {new Date().getFullYear()} Oina.tj {"\u2014"} Dushanbe
              </div>
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
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
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
                {parent.icon && CATEGORY_ICONS[parent.icon]}
                <span>{lang === "tj" && parent.name_tj ? parent.name_tj : parent.name}</span>
              </span>
              {openMegaMenu === parent.id && children.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    background: "var(--bg)",
                    border: "none",
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
            <h2 className="product-title"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    lineHeight: "17px",
                    height: 34,
                    color: "var(--text)",
                    marginTop: 4,
                    marginBottom: 6,
                    cursor: "pointer",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}>{t.recommended}</h2>
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
              style={{ background: "var(--surface)", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                onClick={() => recommendedScrollRef.current?.scrollBy({ left: -300, behavior: "smooth" })}
                style={{ fontSize: 64, color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, userSelect: "none", lineHeight: 1 }}
              >
                ‹
              </span>
              <div
                ref={recommendedScrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const max = el.scrollWidth - el.clientWidth;
                  setRecommendedProgress(max > 0 ? el.scrollLeft / max : 0);
                }}
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
                      style={{ cursor: "pointer", border: "none", borderRadius: 12, overflow: "hidden", background: "var(--bg)" }}
                    >
                      <div style={{ position: "relative", aspectRatio: "3/4", background: "var(--surface)", marginBottom: 8 }}>
                        <AutoSlideImage images={p.images} alt={localized(p.title_ru, p.title_tj)} onClick={() => { if (!isDraggingRecommended) router.push(`/product/${p.id}`); }} />
                        {badge && (
                          <span style={{ position: "absolute", top: 8,
                      filter: "var(--card-action-shadow)", left: 8, fontSize: 10, fontWeight: 500, background: badge.color, color: "#fff", padding: "3px 8px", borderRadius: 4 }}>
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
                style={{ fontSize: 64, color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, userSelect: "none", lineHeight: 1 }}
              >
                ›
              </span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: "var(--line)", overflow: "hidden" }}>
                <div
                  className="carousel-progress-fill"
                  style={{
                    height: "100%",
                    width: `${Math.max(8, Math.round(recommendedProgress * 100))}%`,
                    borderRadius: 2,
                    transition: "width 0.2s ease",
                  }}
                />
              </div>
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
        <SortDropdown
          value={sortOption}
          onChange={setSortOption}
          options={[
            { value: "", label: t.sortDefault },
            { value: "popularity", label: t.sortPopularity },
            { value: "price_asc", label: t.sortPriceAsc },
            { value: "price_desc", label: t.sortPriceDesc },
            { value: "newest", label: t.sortNewest },
            { value: "rating", label: t.sortRating },
            { value: "discount", label: t.sortDiscount },
          ]}
        />
      </div>


      {(() => {
        const chips: { label: string; clear: () => void }[] = [];
        if (minPrice) chips.push({ label: (lang === "ru" ? "\u043e\u0442 " : "\u0430\u0437 ") + minPrice + " \u0441\u043c\u043d", clear: () => setMinPrice("") });
        if (maxPrice) chips.push({ label: (lang === "ru" ? "\u0434\u043e " : "\u0442\u043e ") + maxPrice + " \u0441\u043c\u043d", clear: () => setMaxPrice("") });
        if (filterSize) chips.push({ label: filterSize, clear: () => setFilterSize("") });
        if (filterColor) chips.push({ label: filterColor, clear: () => setFilterColor("") });
        if (filterMaterial) chips.push({ label: filterMaterial, clear: () => setFilterMaterial("") });
        if (filterSeason) chips.push({ label: filterSeason, clear: () => setFilterSeason("") });
        if (filterBrandOnly) chips.push({ label: lang === "ru" ? "\u0422\u043e\u043b\u044c\u043a\u043e \u0431\u0440\u0435\u043d\u0434\u044b" : "\u0422\u0430\u043d\u04b3\u043e \u0431\u0440\u0435\u043d\u0434\u04b3\u043e", clear: () => setFilterBrandOnly(false) });
        if (filterInStock) chips.push({ label: lang === "ru" ? "\u0412 \u043d\u0430\u043b\u0438\u0447\u0438\u0438" : "\u041c\u0430\u0432\u04b7\u0443\u0434", clear: () => setFilterInStock(false) });
        if (filterOnSale) chips.push({ label: lang === "ru" ? "\u0421\u043e \u0441\u043a\u0438\u0434\u043a\u043e\u0439" : "\u0411\u043e \u0442\u0430\u0445\u0444\u0438\u0444", clear: () => setFilterOnSale(false) });
        if (chips.length === 0) return null;
        return (
          <div className="active-filter-chips" style={{ padding: "0 40px 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {chips.map((c, i) => (
              <span
                key={i}
                onClick={c.clear}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 12,
                  fontFamily: "var(--font-label)",
                  borderRadius: 8,
                  boxShadow: "0 0 0 1px var(--accent)",
                  cursor: "pointer",
                }}
              >
                {c.label}
                <span style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1 }}>×</span>
              </span>
            ))}
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
              style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "underline", cursor: "pointer" }}
            >
              {lang === "ru" ? "\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u0432\u0441\u0451" : "\u0422\u043e\u0437\u0430 \u043a\u0430\u0440\u0434\u0430\u043d"}
            </span>
          </div>
        );
      })()}

        <div id="catalog-section" className="catalog-container" style={{ padding: "0 40px 40px" }}>
        <div
          className="products-grid"
          style={{
            display: "grid",
          }}
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
          }).slice(0, visibleCount).map((p) => (
            <div key={p.id} style={{ background: "var(--bg)", padding: 12, borderRadius: 12, border: "1px solid var(--line)", overflow: "hidden" }}>
              <div
                style={{
                  position: "relative",
                  aspectRatio: "var(--card-aspect)",
                  background: "var(--surface)",
                  border: "none",
                  margin: "calc(var(--card-pad) * -1) calc(var(--card-pad) * -1) 8px",
                }}
              >
                <AutoSlideImage images={p.images} alt={localized(p.title_ru, p.title_tj)} onClick={() => router.push(`/product/${p.id}`)} />
                {getRecommendedBadge(p) && (
                  <div
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      background: getRecommendedBadge(p)!.color,
                      color: "#fff",
                      fontFamily: "var(--font-label)",
                      fontSize: 11,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      padding: "4px 8px",
                      borderRadius: 6,
                      pointerEvents: "none",
                      zIndex: 2,
                    }}
                  >
                    {getRecommendedBadge(p)!.text}
                  </div>
                )}
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
                      fill={favoriteIds.has(p.id) ? "var(--heart-active-color)" : "none"}
                      stroke={favoriteIds.has(p.id) ? "var(--heart-active-color)" : "var(--card-action-stroke)"}
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
                      filter: "var(--card-action-shadow)",
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
                      stroke="var(--card-action-stroke)"
                      strokeWidth="1.1"
                    />
                    <path
                      d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11"
                      fill="none"
                      stroke="var(--card-action-stroke)"
                      strokeWidth="1.1"
                    />
                    <line x1="12" y1="16" x2="12" y2="21" stroke="var(--card-action-stroke)" strokeWidth="0.7" />
                    <line x1="15" y1="16" x2="15" y2="21" stroke="var(--card-action-stroke)" strokeWidth="0.7" />
                    <line x1="18" y1="16" x2="18" y2="21" stroke="var(--card-action-stroke)" strokeWidth="0.7" />
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
                      border: "none",
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
                              style={{ padding: "4px 8px", border: "none", cursor: "pointer", fontSize: 12, background: "var(--surface)" }}
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
                  style={{ display: "flex", alignItems: "baseline", gap: 8, cursor: "pointer", marginTop: 4 }}
                >
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#16a34a", letterSpacing: "-0.02em" }}>
                    {p.price} смн
                  </span>
                  {isDiscountActive(p) && (
                    <span style={{ textDecoration: "line-through", color: "var(--text-muted)", fontSize: 12 }}>
                      {Math.round(p.original_price ?? (p.price / (1 - (p.discount_percent as number) / 100)))} смн
                    </span>
                  )}
                </div>

                <div
                  onClick={() => router.push(`/product/${p.id}`)}
                  className="product-title product-card-title"
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text)",
                    marginTop: 3,
                    marginBottom: 6,
                    cursor: "pointer",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={localized(p.title_ru, p.title_tj)}
                >
                  {localized(p.title_ru, p.title_tj)}
                </div>

                <div style={{ marginTop: 2, marginBottom: 8, display: "flex", alignItems: "center" }}>
                  {(() => {
                    const totalStock = p.variants ? p.variants.reduce((sum, v) => sum + (v.stock || 0), 0) : 0;
                    const isOut = totalStock === 0;
                    const isLow = !isOut && totalStock <= 5;

                    const badgeStyle = isOut
                      ? {
                          color: "#dc2626",
                          background: "rgba(220, 38, 38, 0.08)",
                          border: "1px solid rgba(220, 38, 38, 0.25)",
                        }
                      : isLow
                      ? {
                          color: "#d97706",
                          background: "rgba(217, 119, 6, 0.08)",
                          border: "1px solid rgba(217, 119, 6, 0.25)",
                        }
                      : {
                          color: "#16a34a",
                          background: "rgba(22, 163, 74, 0.08)",
                          border: "1px solid rgba(22, 163, 74, 0.25)",
                        };

                    const label = isOut
                      ? (lang === "ru" ? "Нет в наличии" : "Мавҷуд нест")
                      : isLow
                      ? (lang === "ru" ? `Осталось ${totalStock} шт` : `${totalStock} дона монд`)
                      : (lang === "ru" ? "В наличии" : "Мавҷуд ҳаст");

                    return (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "2px 7px",
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          lineHeight: "14px",
                          letterSpacing: "0.02em",
                          ...badgeStyle,
                        }}
                      >
                        {label}
                      </span>
                    );
                  })()}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    paddingTop: 6,
                    borderTop: "1px solid var(--line)",
                    minHeight: 22,
                  }}
                >
                  <StarRating avgRating={p.avg_rating} reviewCount={p.review_count} />
                </div>
            </div>
          ))}
        </div>
        <div ref={loadMoreRef} style={{ height: 1 }} />
      </div>

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
              border: "none",
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
                      onChange={(e) => { setAuthPhone(e.target.value); setAuthError(""); }}
                      style={{ padding: 12, background: "var(--surface)", border: "none", color: "var(--text)", fontSize: 14 }}
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
                      style={{ padding: 12, background: "var(--surface)", border: "none", color: "var(--text)", fontSize: 14 }}
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder={lang === "ru" ? "Новый пароль" : "Пароли нав"}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleResetVerify()}
                      style={{ padding: 12, background: "var(--surface)", border: "none", color: "var(--text)", fontSize: 14 }}
                    />
                    {authError && <span style={{ color: "#E24B4A", fontSize: 13, lineHeight: 1.4, whiteSpace: "normal", wordBreak: "break-word" }}>{authError}</span>}
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
                    style={{ padding: 12, background: "var(--surface)", border: "none", color: "var(--text)", fontSize: 14 }}
                  />
                )}
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {lang === "ru" ? "Номер телефона" : "Раќами телефон"}
                  </div>
                  <div style={{ display: "flex", alignItems: "stretch", background: "var(--surface)", borderRadius: 8, overflow: "hidden" }}>
                    <span style={{ display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14, color: "var(--text-muted)", borderRight: "1px solid var(--line)" }}>
                      +992
                    </span>
                    <input
                      placeholder="900796328"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
                      style={{ flex: 1, padding: 12, background: "transparent", border: "none", color: "var(--text)", fontSize: 14, outline: "none" }}
                    />
                  </div>
                  {authPhone && !isValidPhone(authPhone) && (
                    <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 5 }}>
                      {lang === "ru" ? "Нужно 9 цифр, например 900796328" : "9 рақам лозим аст, мисол 900796328"}
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {lang === "ru" ? "Пароль" : "Парол"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", background: "var(--surface)", borderRadius: 8 }}>
                    <input
                      type={showAuthPassword ? "text" : "password"}
                      autoComplete={authMode === "login" ? "current-password" : "new-password"}
                      placeholder={lang === "ru" ? "Введите пароль" : "Паролро ворид кунед"}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAuthSubmit()}
                      style={{ flex: 1, padding: 12, background: "transparent", border: "none", color: "var(--text)", fontSize: 14, outline: "none" }}
                    />
                    <span
                      onClick={() => setShowAuthPassword((v) => !v)}
                      style={{ cursor: "pointer", padding: "0 12px", display: "flex", alignItems: "center" }}
                      title={showAuthPassword ? "Скрыть" : "Показать"}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
                        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
                        <circle cx="12" cy="12" r="2.6" />
                        {showAuthPassword && <line x1="4" y1="20" x2="20" y2="4" />}
                      </svg>
                    </span>
                  </div>
                </div>

                {authError && <span style={{ color: "#E24B4A", fontSize: 13, lineHeight: 1.4, whiteSpace: "normal", wordBreak: "break-word" }}>{authError}</span>}

                <button
                  onClick={handleAuthSubmit}
                  style={{
                    height: 50,
                    background: "var(--accent-btn-bg)",
                    color: "var(--accent-btn-text)",
                    border: "none",
                    borderRadius: 8,
                    fontFamily: "var(--font-label)",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: "0.06em",
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
                  border: "none",
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
            style={{ position: "absolute", top: "50%", left: 16, transform: "translateY(-50%)", fontSize: 64, color: "#fff", cursor: "pointer", userSelect: "none", zIndex: 2, textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1 }}
          >
            ‹
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % active.length);
            }}
            style={{ position: "absolute", top: "50%", right: 16, transform: "translateY(-50%)", fontSize: 64, color: "#fff", cursor: "pointer", userSelect: "none", zIndex: 2, textShadow: "0 1px 4px rgba(0,0,0,0.5)", lineHeight: 1 }}
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
