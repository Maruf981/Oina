"use client";
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

  return (
    <div data-theme={theme} className="home-root" style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <SiteHeader />



      <HeroSlider banners={banners} />
      <CollectionBar selectedCategoryId={selectedCategoryId} router={router} />

      {recommendedProducts.length > 0 && (
        <div className="recommended-wrapper" style={{ padding: "24px 40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h2 className="product-title"
                  style={{
                    fontSize: 26,
                    fontWeight: 500,
                    lineHeight: "32px",
                    height: "auto",
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
            
            <div key={p.id} className="pc">
              {(() => {
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
                const catName = cat ? (lang === "tj" && cat.name_tj ? cat.name_tj : cat.name) : p.category?.name || "";
                const eyebrow = p.is_brand ? (catName ? `${lang === "ru" ? "Бренд" : "Бренд"} · ${catName}` : (lang === "ru" ? "Бренд" : "Бренд")) : catName;
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
                  <>
                    <div className="pc-media" onClick={() => router.push(`/product/${p.id}`)}>
                      <CardMedia images={p.images} alt={localized(p.title_ru, p.title_tj)} />
                      {badge && <span className="pc-badge">{badge}</span>}
                      {quickAddProductId === p.id && (
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
                          setQuickAddProductId(quickAddProductId === p.id ? null : p.id);
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
                  </>
                );
              })()}
            </div>
            {idx === Math.min(24, products.length) - 1 && dualSlides.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <DualSlider slides={dualSlides} router={router} lang={lang} />
              </div>
            )}
            </Fragment>
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
function CardMedia({ images, alt }: { images: { url: string; media_type?: string }[]; alt: string }) {
  const first = images[0];
  const second = images.slice(1).find((img) => img.media_type !== "video");
  if (!first) return null;
  return (
    <>
      {first.media_type === "video" ? (
        <video src={first.url} autoPlay muted loop playsInline />
      ) : (
        <Image src={first.url} alt={alt} fill sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 25vw" />
      )}
      {second && (
        <Image className="pc-img2" src={second.url} alt={alt} fill sizes="(max-width: 640px) 50vw, (max-width: 900px) 33vw, 25vw" />
      )}
    </>
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
            <img src={b.image_url!} alt="" />
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
