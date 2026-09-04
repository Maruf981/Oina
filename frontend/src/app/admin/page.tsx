"use client";

import { useEffect, useState, useRef } from "react";

type Lang = "ru" | "tj";

const labels = {
  ru: {
    title: "Вход в админку",
    password: "Пароль",
    login: "Войти",
    error: "Неверный пароль",
    products: "Товары",
    categories: "Категории",
    orders: "Заказы",
    warehouse: "Склад",
    finance: "Финансы",
    published: "Опубликованные",
    drafts: "Черновики",
    archived: "Архив",
    quickDrafts: "Быстрые",
    logout: "Выйти",
    addProduct: "Добавить товар",
    addCategory: "Добавить категорию",
    deleteCategory: "Удалить",
    restoreCategory: "Восстановить",
    categoryArchivedLabel: "В архиве",
    confirmDeleteCategory: "Скрыть категорию? Товары в ней останутся, категорию можно будет восстановить.",
    name: "Название",
    slug: "Слаг (латиницей)",
    save: "Сохранить",
    cancel: "Отмена",
    price: "Цена",
    catalogNumber: "Артикул",
    stock: "Остаток",
    noProducts: "Товаров пока нет",
    noOrders: "Заказов пока нет",
    status: "Статус",
    customer: "Клиент",
    total: "Сумма",
    date: "Дата",
    description: "Описание",
    material: "Материал",
    country: "Страна производства",
    care: "Уход",
    category: "Категория",
    variants: "Варианты (размер/цвет/остаток)",
    addVariant: "Добавить вариант",
    size: "Размер",
    color: "Цвет",
    sku: "Артикул",
    uploadImage: "Загрузить фото",
  },
  tj: {
    title: "Воридшавӣ ба админ",
    password: "Парол",
    login: "Даромадан",
    error: "Парол нодуруст",
    products: "Молҳо",
    categories: "Категорияҳо",
    orders: "Фармоишҳо",
    warehouse: "Анбор",
    finance: "Молия",
    published: "Молҳои нашршуда",
    drafts: "Лоиҳаҳо",
    archived: "Бойгонӣ",
    quickDrafts: "Зуд",
    logout: "Баромадан",
    addProduct: "Иловаи мол",
    addCategory: "Иловаи категория",
    deleteCategory: "Нест кардан",
    restoreCategory: "Барқарор кардан",
    categoryArchivedLabel: "Дар бойгонӣ",
    confirmDeleteCategory: "Категорияро пинҳон кунам? Молҳо дар он мемонанд, категорияро баъдан барқарор кардан мумкин аст.",
    name: "Ном",
    slug: "Слаг (бо ҳарфҳои лотинӣ)",
    save: "Нигоҳ доштан",
    cancel: "Бекор кардан",
    price: "Нарх",
    catalogNumber: "Артикул",
    stock: "Захира",
    noProducts: "Ҳанӯз молҳо нестанд",
    noOrders: "Ҳанӯз фармоишҳо нестанд",
    status: "Ҳолат",
    customer: "Мизоҷ",
    total: "Маблағ",
    date: "Сана",
    description: "Тавсиф",
    material: "Матоъ",
    country: "Кишвари истеҳсол",
    care: "Нигоҳубин",
    category: "Категория",
    variants: "Вариантҳо (андоза/ранг/захира)",
    addVariant: "Иловаи вариант",
    size: "Андоза",
    color: "Ранг",
    sku: "Артикул",
    uploadImage: "Боркунии акс",
  },
};

type Category = { id: number; name: string; slug: string; parent_id: number | null; is_archived?: boolean };
type Supplier = { id: number; name: string; phone: string | null };

type Variant = { id: number; size: string; color: string; stock: number; sku: string };

type ProductImage = { id: number; url: string; color: string | null };

type Product = {
  id: number;
  catalog_number: string;
  title_ru: string;
  title_tj: string | null;
  description_ru: string | null;
  description_tj: string | null;
  price: number;
  material_ru: string | null;
  material_tj: string | null;
  country_of_origin_ru: string | null;
  country_of_origin_tj: string | null;
  care_instructions_ru: string | null;
  care_instructions_tj: string | null;
  category_id: number;
  category: Category | null;
  variants: Variant[];
  images: ProductImage[];
  is_active: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_brand: boolean;
  discount_percent: number | null;
  cost_price: number | null;
  supplier_id: number | null;
};

type Order = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string | null;
  comment: string | null;
  payment_method: string | null;
  customer: { id: number; name: string | null; phone: string };
  items: { id: number; product_variant_id: number; quantity: number; price_at_order: number; variant: { id: number; size: string; color: string; title_ru: string; title_tj: string | null; catalog_number: string } | null }[];
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

const COLOR_OPTIONS = [
  "Красный", "Тёмно-красный", "Бордовый",
  "Синий", "Тёмно-синий", "Голубой", "Светло-голубой",
  "Зелёный", "Тёмно-зелёный", "Изумрудный",
  "Жёлтый", "Горчичный",
  "Оранжевый", "Терракотовый",
  "Фиолетовый", "Сиреневый", "Лавандовый",
  "Розовый", "Пудровый",
  "Чёрный", "Белый",
  "Серый", "Светло-серый", "Тёмно-серый",
  "Бежевый", "Коричневый", "Хаки",
  "Мятный", "Золотой", "Серебристый",
  "Малиновый", "Лимонный", "Молочный", "Кремовый",
];
const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"];
const NUMERIC_SIZES = Array.from({ length: 50 - 15 + 1 }, (_, i) => String(15 + i));

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

export default function AdminPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const t = labels[lang];

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState<"products" | "categories" | "orders" | "warehouse" | "finance" | "published" | "drafts" | "archived" | "quickDrafts">(() => {
    if (typeof window === "undefined") return "products";
    return (localStorage.getItem("admin_tab") as any) || "products";
  });
  useEffect(() => {
    localStorage.setItem("admin_tab", tab);
  }, [tab]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [incomingMovements, setIncomingMovements] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("admin_theme") as "dark" | "light" | null;
    if (savedTheme) setTheme(savedTheme);
    const savedLang = localStorage.getItem("admin_lang") as Lang | null;
    if (savedLang) setLang(savedLang);
    const savedToken = localStorage.getItem("admin_token");
    if (savedToken) setToken(savedToken);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("admin_theme", next);
  };

  const toggleLang = () => {
    const next = lang === "ru" ? "tj" : "ru";
    setLang(next);
    localStorage.setItem("admin_lang", next);
  };

  const handleLogin = async () => {
    setLoginError("");
    try {
      const res = await fetch(`${API}/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "admin", password }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem("admin_token", data.access_token);
      setToken(data.access_token);
    } catch {
      setLoginError(t.error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setToken(null);
  };

  const authFetch = (url: string, options: RequestInit = {}) =>
    fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

  useEffect(() => {
    if (!token) return;
    refreshProducts();
    fetch(`${API}/categories/?include_archived=true`).then((r) => r.json()).then(setCategories);
    authFetch(`${API}/orders/`).then((r) => (r.ok ? r.json() : [])).then(setOrders);
    authFetch(`${API}/suppliers/`).then((r) => (r.ok ? r.json() : [])).then(setSuppliers);
    authFetch(`${API}/stock-movements/?movement_type=incoming`).then((r) => (r.ok ? r.json() : [])).then(setIncomingMovements);
  }, [token]);

  const refreshProducts = () =>
    authFetch(`${API}/products/admin/all`).then((r) => {
      if (r.status === 401) {
        handleLogout();
        return [];
      }
      return r.ok ? r.json() : [];
    }).then(setProducts);
  const refreshCategories = () => fetch(`${API}/categories/?include_archived=true`).then((r) => r.json()).then(setCategories);
  const refreshOrders = () => authFetch(`${API}/orders/`).then((r) => (r.ok ? r.json() : [])).then(setOrders);
  const refreshSuppliers = () => authFetch(`${API}/suppliers/`).then((r) => (r.ok ? r.json() : [])).then(setSuppliers);

  if (!token) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 320, display: "flex", flexDirection: "column", gap: 16 }}>
          <span className="product-title" style={{ fontSize: 22, textAlign: "center", marginBottom: 10 }}>
            {t.title}
          </span>
          <input
            type="password"
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
          />
          {loginError && <span style={{ color: "#c0504d", fontSize: 13 }}>{loginError}</span>}
          <button
            onClick={handleLogin}
            style={{ padding: 14, background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
          >
            {t.login}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 40px", borderBottom: "1px solid var(--line)" }}>
        <span className="product-title" style={{ fontSize: 20, fontStyle: "italic" }}>Oina Admin</span>
        <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
          <span onClick={toggleLang} style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 12, color: "var(--text-muted)" }}>
            {lang === "ru" ? "RU" : "TJ"}
          </span>
          <span onClick={toggleTheme} style={{ cursor: "pointer", fontSize: 14 }}>
            {theme === "dark" ? "☀" : "☾"}
          </span>
          <span onClick={handleLogout} style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 12, color: "var(--text-muted)" }}>
            {t.logout}
          </span>
        </div>
      </nav>
      <div style={{ display: "flex", gap: 24, padding: "20px 16px", borderBottom: "1px solid var(--line)", overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch" }}>
        {(["products", "categories", "orders", "warehouse", "finance", "published", "drafts", "archived", "quickDrafts"] as const).map((tabName) => (
          <span
            key={tabName}
            onClick={() => setTab(tabName)}
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-label)",
              fontSize: 13,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: tab === tabName ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === tabName ? "2px solid var(--accent)" : "2px solid transparent",
              paddingBottom: 8,
            }}
          >
            {t[tabName]}
          </span>
        ))}
      </div>

      <div style={{ padding: 40 }}>
        {(tab === "products" || tab === "published" || tab === "drafts" || tab === "archived") && (
          <ProductsTab
            t={t}
            view={tab}
            products={products}
            categories={categories}
            suppliers={suppliers}
            refreshSuppliers={refreshSuppliers}
            selectedProduct={selectedProduct}
            setSelectedProduct={setSelectedProduct}
            creatingProduct={creatingProduct}
            setCreatingProduct={setCreatingProduct}
            authFetch={authFetch}
            refreshProducts={refreshProducts}
            token={token}
          />
        )}
        {tab === "categories" && (
          <CategoriesTab
            t={t}
            categories={categories}
            creatingCategory={creatingCategory}
            setCreatingCategory={setCreatingCategory}
            authFetch={authFetch}
            refreshCategories={refreshCategories}
          />
        )}
        {tab === "orders" && <OrdersTab t={t} orders={orders} authFetch={authFetch} refreshOrders={refreshOrders} lang={lang} />}
        {tab === "warehouse" && <WarehouseTab products={products} suppliers={suppliers} incomingMovements={incomingMovements} />}
        {tab === "finance" && <FinanceTab orders={orders} products={products} suppliers={suppliers} authFetch={authFetch} />}
        {tab === "quickDrafts" && <QuickDraftsTab authFetch={authFetch} />}
      </div>
    </div>
  );
}

function getAdminBadgeSrc(p: Product): string | null {
  if (p.discount_percent) {
    const steps = [5, 10, 15, 20, 25, 30, 40, 50];
    let closest = steps[0];
    for (const step of steps) {
      if (step <= p.discount_percent) closest = step;
    }
    return `/badge-discount-${closest}.png`;
  }
  if (p.is_new) return "/badge-new.png";
  if (p.is_featured) return "/badge-featured.png";
  return null;
}

function ProductsTab({ t, view, products, categories, suppliers, refreshSuppliers, selectedProduct, setSelectedProduct, creatingProduct, setCreatingProduct, authFetch, refreshProducts, token }: any) {
  const productList: Product[] = Array.isArray(products) ? products : [];
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [draftPage, setDraftPage] = useState(1);
  const [publishedPage, setPublishedPage] = useState(1);
  const [archivedProducts, setArchivedProducts] = useState<Product[]>([]);
  const [archivedPage, setArchivedPage] = useState(1);
  useEffect(() => {
    if (view === "archived") {
      authFetch(`${API}/products/admin/archived`).then((r: any) => r.json()).then(setArchivedProducts);
    }
  }, [view]);
  const handleRestore = (id: number) => {
    authFetch(`${API}/products/${id}/restore`, { method: "POST" }).then(() => {
      setArchivedProducts((prev) => prev.filter((p) => p.id !== id));
      refreshProducts();
    });
  };

  if (selectedProduct || creatingProduct) {
    return (
      <ProductForm
        t={t}
        product={selectedProduct}
        categories={categories}
        suppliers={suppliers}
        refreshSuppliers={refreshSuppliers}
        authFetch={authFetch}
        onClose={() => {
          setSelectedProduct(null);
          setCreatingProduct(false);
          refreshProducts();
        }}
        onCreated={(newProduct: any) => {
          setSelectedProduct(newProduct);
          setCreatingProduct(false);
          refreshProducts();
        }}
        token={token}
      />
    );
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const publishOne = (id: number) => {
    authFetch(`${API}/products/${id}/publish`, { method: "POST" }).then(() => refreshProducts());
  };

  const publishSelected = () => {
    Promise.all(
      Array.from(selectedIds).map((id) => authFetch(`${API}/products/${id}/publish`, { method: "POST" }))
    ).then(() => {
      setSelectedIds(new Set());
      refreshProducts();
    });
  };

  const draftProducts = productList.filter((p) => !p.is_active);
  const publishedProducts = productList.filter((p) => p.is_active);
  const PAGE_SIZE = 20;
  const draftTotalPages = Math.max(1, Math.ceil(draftProducts.length / PAGE_SIZE));
  const publishedTotalPages = Math.max(1, Math.ceil(publishedProducts.length / PAGE_SIZE));
  const currentDraftPage = Math.min(draftPage, draftTotalPages);
  const currentPublishedPage = Math.min(publishedPage, publishedTotalPages);
  const pagedDraftProducts = draftProducts.slice((currentDraftPage - 1) * PAGE_SIZE, currentDraftPage * PAGE_SIZE);
  const pagedPublishedProducts = publishedProducts.slice((currentPublishedPage - 1) * PAGE_SIZE, currentPublishedPage * PAGE_SIZE);

  const renderCard = (p: Product, showCheckbox: boolean) => (
    <div
      key={p.id}
      onClick={() => setSelectedProduct(p)}
      style={{ cursor: "pointer", border: "1px solid var(--line)", padding: 16, position: "relative" }}
    >
      {showCheckbox && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            toggleSelect(p.id);
          }}
          style={{ position: "absolute", top: 8, left: 8, zIndex: 1 }}
        >
          <input type="checkbox" checked={selectedIds.has(p.id)} readOnly style={{ width: 18, height: 18, cursor: "pointer" }} />
        </span>
      )}
      <span
        onClick={(e) => {
          e.stopPropagation();
          if (confirm(`Удалить товар "${p.title_ru}"?`)) {
            authFetch(`${API}/products/${p.id}`, { method: "DELETE" }).then(() => refreshProducts());
          }
        }}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 1,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.6)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        ✕
      </span>
      <div
        style={{
          position: "relative",
          aspectRatio: "3/4",
          background: "var(--surface)",
          marginBottom: 10,
          backgroundImage: p.images[0] ? `url(${p.images[0].url})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {getAdminBadgeSrc(p) && (
          <img
            src={getAdminBadgeSrc(p)!}
            alt="Бейдж"
            style={{ position: "absolute", top: -9, left: -9, width: 56, height: 56, objectFit: "contain", pointerEvents: "none" }}
          />
        )}
        {p.is_brand && (
          <img
            src="/badge-brand.png"
            alt="Бренд"
            style={{ position: "absolute", top: -25, left: "50%", transform: "translateX(-50%)", width: 84, height: 84, objectFit: "contain", pointerEvents: "none" }}
          />
        )}
      </div>
      <div className="product-title" style={{ fontSize: 15, marginBottom: 4 }}>{p.title_ru}</div>
      <div className="catalog-label" style={{ border: "none", padding: 0, display: "flex", justifyContent: "space-between", marginBottom: showCheckbox ? 10 : 0 }}>
        <span>{t.catalogNumber} {p.catalog_number}</span>
        <span className="price">{p.price} смн</span>
      </div>
      {showCheckbox && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            publishOne(p.id);
          }}
          style={{ width: "100%", padding: "8px", background: "var(--accent)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          Опубликовать
        </button>
      )}
    </div>
  );
  return (
    <div>
      {view === "products" && (
        <button
          onClick={() => setCreatingProduct(true)}
          style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          + {t.addProduct}
        </button>
      )}

      {view === "drafts" && draftProducts.length === 0 && <p style={{ color: "var(--text-muted)" }}>Черновиков пока нет</p>}

      {view === "drafts" && draftProducts.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div className="catalog-label" style={{ border: "none", padding: 0, color: "var(--text-muted)" }}>
              Черновики ({draftProducts.length})
            </div>
            {selectedIds.size > 0 && (
              <button
                onClick={publishSelected}
                style={{ padding: "8px 16px", background: "var(--accent)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Опубликовать выбранные ({selectedIds.size})
              </button>
            )}
          </div>
          <div className="admin-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {pagedDraftProducts.map((p) => renderCard(p, true))}
          </div>
          {draftTotalPages > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 20 }}>
              <button onClick={() => setDraftPage(Math.max(1, currentDraftPage - 1))} disabled={currentDraftPage === 1} style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: currentDraftPage === 1 ? "not-allowed" : "pointer", opacity: currentDraftPage === 1 ? 0.5 : 1 }}>← Назад</button>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Страница {currentDraftPage} из {draftTotalPages}</span>
              <button onClick={() => setDraftPage(Math.min(draftTotalPages, currentDraftPage + 1))} disabled={currentDraftPage === draftTotalPages} style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: currentDraftPage === draftTotalPages ? "not-allowed" : "pointer", opacity: currentDraftPage === draftTotalPages ? 0.5 : 1 }}>Вперёд →</button>
            </div>
          )}
        </div>
      )}

      {view === "published" && publishedProducts.length === 0 && <p style={{ color: "var(--text-muted)" }}>Опубликованных товаров пока нет</p>}

      {view === "published" && publishedProducts.length > 0 && (
        <div>
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16, color: "var(--text-muted)" }}>
            Опубликовано ({publishedProducts.length})
          </div>
          <div className="admin-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {pagedPublishedProducts.map((p) => renderCard(p, false))}
          </div>
          {publishedTotalPages > 1 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 20 }}>
              <button onClick={() => setPublishedPage(Math.max(1, currentPublishedPage - 1))} disabled={currentPublishedPage === 1} style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: currentPublishedPage === 1 ? "not-allowed" : "pointer", opacity: currentPublishedPage === 1 ? 0.5 : 1 }}>← Назад</button>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Страница {currentPublishedPage} из {publishedTotalPages}</span>
              <button onClick={() => setPublishedPage(Math.min(publishedTotalPages, currentPublishedPage + 1))} disabled={currentPublishedPage === publishedTotalPages} style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: currentPublishedPage === publishedTotalPages ? "not-allowed" : "pointer", opacity: currentPublishedPage === publishedTotalPages ? 0.5 : 1 }}>Вперёд →</button>
            </div>
          )}
        </div>
      )}
      {view === "archived" && archivedProducts.length === 0 && <p style={{ color: "var(--text-muted)" }}>Архив пуст</p>}
      {view === "archived" && archivedProducts.length > 0 && (
        <div>
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16, color: "var(--text-muted)" }}>
            В архиве ({archivedProducts.length})
          </div>
          <div className="admin-products-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {archivedProducts.slice((archivedPage - 1) * 20, archivedPage * 20).map((p) => (
              <div key={p.id} style={{ border: "1px solid var(--line)", padding: 16, opacity: 0.7 }}>
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "3/4",
                    background: "var(--surface)",
                    marginBottom: 10,
                    backgroundImage: p.images[0] ? `url(${p.images[0].url})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="product-title" style={{ fontSize: 15, marginBottom: 4 }}>{p.title_ru}</div>
                <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 10 }}>
                  {t.catalogNumber} {p.catalog_number}
                </div>
                <button
                  onClick={() => handleRestore(p.id)}
                  style={{ width: "100%", padding: "8px", background: "var(--accent)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  Восстановить
                </button>
              </div>
            ))}
          </div>
          {archivedProducts.length > 20 && (
            <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 20 }}>
              <button onClick={() => setArchivedPage((p) => Math.max(1, p - 1))} disabled={archivedPage === 1} style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: archivedPage === 1 ? "not-allowed" : "pointer", opacity: archivedPage === 1 ? 0.5 : 1 }}>← Назад</button>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Страница {archivedPage} из {Math.ceil(archivedProducts.length / 20)}</span>
              <button onClick={() => setArchivedPage((p) => Math.min(Math.ceil(archivedProducts.length / 20), p + 1))} disabled={archivedPage >= Math.ceil(archivedProducts.length / 20)} style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: archivedPage >= Math.ceil(archivedProducts.length / 20) ? "not-allowed" : "pointer", opacity: archivedPage >= Math.ceil(archivedProducts.length / 20) ? 0.5 : 1 }}>Вперёд →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function ProductForm({ t, product, categories, suppliers, refreshSuppliers, authFetch, onClose, onCreated }: any) {
  const [form, setForm] = useState({
    category_id: product?.category_id ?? categories[0]?.id ?? 1,
    title_ru: product?.title_ru ?? "",
    title_tj: product?.title_tj ?? "",
    description_ru: product?.description_ru ?? "",
    description_tj: product?.description_tj ?? "",
    price: product?.price ?? "",
    cost_price: product?.cost_price ?? "",
    supplier_id: product?.supplier_id ?? "",
    material_ru: product?.material_ru ?? "",
    material_tj: product?.material_tj ?? "",
    country_of_origin_ru: product?.country_of_origin_ru ?? "",
    country_of_origin_tj: product?.country_of_origin_tj ?? "",
    care_instructions_ru: product?.care_instructions_ru ?? "",
    care_instructions_tj: product?.care_instructions_tj ?? "",
    season_ru: product?.season_ru ?? "",
    season_tj: product?.season_tj ?? "",
    pattern_ru: product?.pattern_ru ?? "",
    pattern_tj: product?.pattern_tj ?? "",
    badgeType: (product?.discount_percent ? "discount" : product?.is_new ? "new" : product?.is_featured ? "featured" : "none") as "none" | "featured" | "new" | "discount",
    is_brand: product?.is_brand ?? false,
    discount_percent: product?.discount_percent ?? "",
    discount_from: product?.discount_from ?? "",
    discount_to: product?.discount_to ?? "",
  });
  const [variants, setVariants] = useState<{ size: string; color: string; stock: number }[]>(
    product?.variants ?? []
  );
  type GuideFields = {
    chest: string;
    waist: string;
    garment_length: string;
    sleeve_length: string;
    shoulder_width: string;
  };
  const EMPTY_GUIDE_ROW: GuideFields = { chest: "", waist: "", garment_length: "", sleeve_length: "", shoulder_width: "" };
  const [sizeGuide, setSizeGuide] = useState<Record<string, GuideFields>>(() => {
    const initial: Record<string, GuideFields> = {};
    (product?.size_guide ?? []).forEach((row: any) => {
      initial[row.size] = {
        chest: row.chest ?? "",
        waist: row.waist ?? "",
        garment_length: row.garment_length ?? "",
        sleeve_length: row.sleeve_length ?? "",
        shoulder_width: row.shoulder_width ?? "",
      };
    });
    return initial;
  });
  const updateSizeGuideField = (size: string, field: keyof GuideFields, value: string) => {
    setSizeGuide((prev) => ({
      ...prev,
      [size]: { ...(prev[size] ?? EMPTY_GUIDE_ROW), [field]: value },
    }));
  };
  const guideSizesOrder = [...LETTER_SIZES, ...NUMERIC_SIZES];
  const allSizesForGuide = Array.from(new Set(variants.map((v) => v.size))).sort(
    (a, b) => guideSizesOrder.indexOf(a) - guideSizesOrder.indexOf(b)
  );
  const letterSizesForGuide = allSizesForGuide.filter((s) => LETTER_SIZES.includes(s));
  const numericSizesForGuide = allSizesForGuide.filter((s) => NUMERIC_SIZES.includes(s));
  const [saving, setSaving] = useState(false);
  const [createdNotice, setCreatedNotice] = useState(false);
  const savingRef = useRef(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState(product?.images ?? []);

  const updateField = (key: string, value: any) => setForm({ ...form, [key]: value });

  const [activeColors, setActiveColors] = useState<string[]>(
    Array.from(new Set((product?.variants ?? []).map((v: any) => v.color)))
  );
  const [sizeTypeByColor, setSizeTypeByColor] = useState<Record<string, "letter" | "numeric" | "onesize" | "custom">>({});
  const [customSizeInput, setCustomSizeInput] = useState<Record<string, string>>({});

  const toggleColorActive = (color: string) => {
    if (activeColors.includes(color)) {
      setActiveColors(activeColors.filter((c) => c !== color));
      setVariants(variants.filter((v) => v.color !== color));
    } else {
      setActiveColors([...activeColors, color]);
    }
  };

  const toggleSizeForColor = (color: string, size: string) => {
    const exists = variants.find((v) => v.color === color && v.size === size);
    if (exists) {
      setVariants(variants.filter((v) => !(v.color === color && v.size === size)));
    } else {
      setVariants([...variants, { size, color, stock: 0 }]);
    }
  };

  const updateStockForColorSize = (color: string, size: string, stock: number) => {
    setVariants(
      variants.map((v) => (v.color === color && v.size === size ? { ...v, stock } : v))
    );
  };

  const handleSave = async () => {
    if (!form.title_ru.trim()) {
      alert("Заполните название товара (RU)");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      alert("Укажите цену продажи больше 0");
      return;
    }
    if (!form.cost_price || Number(form.cost_price) <= 0) {
      alert("Укажите закупочную цену больше 0");
      return;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const { badgeType, ...restForm } = form;
      const payload = {
        ...restForm,
        price: Number(form.price),
        cost_price: form.cost_price !== "" ? Number(form.cost_price) : null,
        supplier_id: form.supplier_id !== "" ? Number(form.supplier_id) : null,
        is_featured: badgeType === "featured",
        is_new: badgeType === "new",
        is_brand: form.is_brand,
        discount_percent: badgeType === "discount" && form.discount_percent !== "" ? Number(form.discount_percent) : null,
        discount_from: badgeType === "discount" && form.discount_from !== "" ? form.discount_from : null,
        discount_to: badgeType === "discount" && form.discount_to !== "" ? form.discount_to : null,
        is_active: product ? product.is_active : false,
        variants,
        size_guide:
          allSizesForGuide.length > 0
            ? allSizesForGuide.map((size) => ({
                size,
                chest: sizeGuide[size]?.chest || null,
                waist: sizeGuide[size]?.waist || null,
                garment_length: sizeGuide[size]?.garment_length || null,
                sleeve_length: sizeGuide[size]?.sleeve_length || null,
                shoulder_width: sizeGuide[size]?.shoulder_width || null,
              }))
            : null,
      };
      const url = product
        ? `${API}/products/${product.id}`
        : `${API}/products/`;
      const method = product ? "PATCH" : "POST";
      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      if (!product) {
        const created = await res.json();
        onCreated(created);
        setCreatedNotice(true);
        setTimeout(() => setCreatedNotice(false), 4000);
      } else {
        onClose();
      }
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const [imageColor, setImageColor] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product || !e.target.files?.length) return;
    setUploadingImage(true);
    const files = Array.from(e.target.files);
    const url = imageColor
      ? `${API}/upload/product-image/${product.id}?color=${encodeURIComponent(imageColor)}`
      : `${API}/upload/product-image/${product.id}`;
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await authFetch(url, {
          method: "POST",
          body: formData,
        });
        if (res.ok) {
          const newImage = await res.json();
          setProductImages((prev: any[]) => [...prev, newImage]);
        }
      }
      setImageColor("");
      e.target.value = "";
    } finally {
      setUploadingImage(false);
    }
  };
  const handleDeleteImage = async (imageId: number) => {
    if (!confirm("Удалить это фото/видео?")) return;
    const res = await authFetch(`${API}/upload/product-image/${imageId}`, { method: "DELETE" });
    if (res.ok) {
      setProductImages((prev: any[]) => prev.filter((img) => img.id !== imageId));
    }
  };
  const handleSetPrimary = async (imageId: number) => {
    const res = await authFetch(`${API}/upload/product-image/${imageId}/set-primary`, { method: "POST" });
    if (res.ok) {
      setProductImages((prev: any[]) => {
        const target = prev.find((img) => img.id === imageId);
        if (!target) return prev;
        return [target, ...prev.filter((img) => img.id !== imageId)];
      });
    }
  };
  const inputStyle = { padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 700 }}>
      <span onClick={onClose} style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 20 }}>
        ← {t.cancel}
      </span>
      {createdNotice && (
        <div style={{ background: "var(--accent)", color: "var(--bg)", padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
          Товар создан, теперь можно загрузить фото
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.name} (RU)`} value={form.title_ru} onChange={(e) => updateField("title_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.name} (TJ) — авто, можно поправить`} value={form.title_tj} onChange={(e) => updateField("title_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input type="number" placeholder={t.price} value={form.price} onChange={(e) => updateField("price", e.target.value)} style={inputStyle} />
        <select value={form.category_id} onChange={(e) => updateField("category_id", Number(e.target.value))} style={inputStyle}>
          {categories.filter((c: Category) => !c.parent_id && !c.is_archived).map((parent: Category) => {
            const children = categories.filter((c: Category) => c.parent_id === parent.id && !c.is_archived);
            if (children.length === 0) {
              return <option key={parent.id} value={parent.id}>{parent.name}</option>;
            }
            return (
              <optgroup key={parent.id} label={parent.name}>
                <option value={parent.id}>{parent.name} (общее)</option>
                {children.map((child: Category) => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input
          type="number"
          placeholder="Закупочная цена (себестоимость)"
          value={form.cost_price}
          onChange={(e) => updateField("cost_price", e.target.value)}
          style={inputStyle}
        />
        <SupplierPicker
          suppliers={suppliers}
          value={form.supplier_id}
          onChange={(id: number | "") => updateField("supplier_id", id)}
          authFetch={authFetch}
          refreshSuppliers={refreshSuppliers}
          inputStyle={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.material} (RU)`} value={form.material_ru} onChange={(e) => updateField("material_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.material} (TJ)`} value={form.material_tj} onChange={(e) => updateField("material_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.country} (RU)`} value={form.country_of_origin_ru} onChange={(e) => updateField("country_of_origin_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.country} (TJ)`} value={form.country_of_origin_tj} onChange={(e) => updateField("country_of_origin_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.care} (RU)`} value={form.care_instructions_ru} onChange={(e) => updateField("care_instructions_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.care} (TJ)`} value={form.care_instructions_tj} onChange={(e) => updateField("care_instructions_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder="Сезон (RU)" value={form.season_ru} onChange={(e) => updateField("season_ru", e.target.value)} style={inputStyle} />
        <input placeholder="Сезон (TJ)" value={form.season_tj} onChange={(e) => updateField("season_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder="Рисунок (RU)" value={form.pattern_ru} onChange={(e) => updateField("pattern_ru", e.target.value)} style={inputStyle} />
        <input placeholder="Рисунок (TJ)" value={form.pattern_tj} onChange={(e) => updateField("pattern_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <textarea placeholder={`${t.description} (RU)`} value={form.description_ru} onChange={(e) => updateField("description_ru", e.target.value)} rows={3} style={inputStyle} />
        <textarea placeholder={`${t.description} (TJ)`} value={form.description_tj} onChange={(e) => updateField("description_tj", e.target.value)} rows={3} style={inputStyle} />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>Бейдж на карточке (можно выбрать только один)</div>
        <div style={{ display: "flex", gap: 20, marginBottom: 14 }}>
          {(["none", "featured", "new", "discount"] as const).map((option) => (
            <label key={option} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
              <input
                type="radio"
                name="badgeType"
                checked={form.badgeType === option}
                onChange={() => updateField("badgeType", option)}
              />
              {option === "none" && "Без бейджа"}
              {option === "featured" && "Хорошая цена"}
              {option === "new" && "Новинка"}
              {option === "discount" && "Скидка"}
            </label>
          ))}
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer", marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={form.is_brand}
            onChange={(e) => updateField("is_brand", e.target.checked)}
          />
          Бренд (можно сочетать с любым бейджем выше)
        </label>

        {form.badgeType === "discount" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <input
              type="number"
              placeholder="Скидка, %"
              value={form.discount_percent}
              onChange={(e) => updateField("discount_percent", e.target.value)}
              style={inputStyle}
            />
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Действует с</div>
              <input
                type="date"
                value={form.discount_from}
                onChange={(e) => updateField("discount_from", e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Действует по</div>
              <input
                type="date"
                value={form.discount_to}
                onChange={(e) => updateField("discount_to", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
        )}
      </div>

      <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 12 }}>{t.variants}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {COLOR_OPTIONS.map((color) => {
          const active = activeColors.includes(color);
          const hex = getColorHex(color);
          return (
            <button
              key={color}
              type="button"
              onClick={() => toggleColorActive(color)}
              style={{
                minWidth: 44,
                height: 36,
                padding: "0 12px",
                background: hex,
                color: getContrastText(hex),
                border: "1px solid var(--line)",
                boxShadow: active ? "0 0 0 2px var(--text)" : "none",
                fontFamily: "var(--font-label)",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {color}
            </button>
          );
        })}
      </div>

      {activeColors.map((color) => {
        const sizeType = sizeTypeByColor[color] ?? "letter";
        const customSizesForColor = variants.filter((v) => v.color === color && !LETTER_SIZES.includes(v.size) && !NUMERIC_SIZES.includes(v.size) && v.size !== "Безразмерный").map((v) => v.size);
        const sizes = sizeType === "numeric" ? NUMERIC_SIZES : sizeType === "onesize" ? ["Безразмерный"] : sizeType === "custom" ? customSizesForColor : LETTER_SIZES;
        return (
          <div key={color} style={{ border: "1px solid var(--line)", padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-label)", fontSize: 13 }}>{color}</span>
              <span
                onClick={() => toggleColorActive(color)}
                style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12 }}
              >
                Убрать цвет
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setSizeTypeByColor({ ...sizeTypeByColor, [color]: "letter" })}
                style={{
                  padding: "6px 12px",
                  background: sizeType === "letter" ? "var(--text)" : "var(--surface)",
                  color: sizeType === "letter" ? "var(--bg)" : "var(--text)",
                  border: "1px solid var(--line)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Буквенный (XL)
              </button>
              <button
                type="button"
                onClick={() => setSizeTypeByColor({ ...sizeTypeByColor, [color]: "numeric" })}
                style={{
                  padding: "6px 12px",
                  background: sizeType === "numeric" ? "var(--text)" : "var(--surface)",
                  color: sizeType === "numeric" ? "var(--bg)" : "var(--text)",
                  border: "1px solid var(--line)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Числовой (34)
              </button>
              <button
                type="button"
                onClick={() => setSizeTypeByColor({ ...sizeTypeByColor, [color]: "onesize" })}
                style={{
                  padding: "6px 12px",
                  background: sizeType === "onesize" ? "var(--text)" : "var(--surface)",
                  color: sizeType === "onesize" ? "var(--bg)" : "var(--text)",
                  border: "1px solid var(--line)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Безразмерный
              </button>
              <button
                type="button"
                onClick={() => setSizeTypeByColor({ ...sizeTypeByColor, [color]: "custom" })}
                style={{
                  padding: "6px 12px",
                  background: sizeType === "custom" ? "var(--text)" : "var(--surface)",
                  color: sizeType === "custom" ? "var(--bg)" : "var(--text)",
                  border: "1px solid var(--line)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Свой размер
              </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {sizes.map((size) => {
                const variant = variants.find((v) => v.color === color && v.size === size);
                const active = !!variant;
                return (
                  <div key={size} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => toggleSizeForColor(color, size)}
                      style={{
                        minWidth: 40,
                        height: 36,
                        padding: "0 10px",
                        background: active ? "var(--accent)" : "var(--surface)",
                        color: active ? "var(--bg)" : "var(--text)",
                        border: active ? "1px solid var(--accent)" : "1px solid var(--line)",
                        fontFamily: "var(--font-label)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {size}
                    </button>
                    {active && (
                      <input
                        type="number"
                        value={variant!.stock}
                        onChange={(e) => updateStockForColorSize(color, size, Number(e.target.value))}
                        placeholder="Остаток"
                        style={{ width: 60, padding: 6, fontSize: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)" }}
                      />
                    )}
                  </div>
                );
              })}
              {sizeType === "custom" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="text"
                    value={customSizeInput[color] ?? ""}
                    onChange={(e) => setCustomSizeInput({ ...customSizeInput, [color]: e.target.value })}
                    placeholder="Введите размер"
                    style={{ padding: "6px 10px", fontSize: 13, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", width: 140 }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const value = (customSizeInput[color] ?? "").trim();
                      if (!value) return;
                      toggleSizeForColor(color, value);
                      setCustomSizeInput({ ...customSizeInput, [color]: "" });
                    }}
                    style={{ padding: "6px 12px", background: "var(--text)", color: "var(--bg)", border: "none", fontSize: 12, cursor: "pointer" }}
                  >
                    Добавить
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {[
        { label: "Гид по размерам (буквенные)", sizes: letterSizesForGuide },
        { label: "Гид по размерам (числовые)", sizes: numericSizesForGuide },
      ].map(
        ({ label, sizes }) =>
          sizes.length > 0 && (
            <div key={label} style={{ marginBottom: 24 }}>
              <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 12 }}>
                {label}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "50px repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Размер</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Грудь, см</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Талия, см</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Длина одежды, см</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Длина рукава, см</div>
                <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Ширина плеч, см</div>
              </div>
              {sizes.map((size) => (
                <div key={size} style={{ display: "grid", gridTemplateColumns: "50px repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", fontSize: 13 }}>{size}</div>
                  <input
                    placeholder="88-92"
                    value={sizeGuide[size]?.chest ?? ""}
                    onChange={(e) => updateSizeGuideField(size, "chest", e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="72-76"
                    value={sizeGuide[size]?.waist ?? ""}
                    onChange={(e) => updateSizeGuideField(size, "waist", e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="70"
                    value={sizeGuide[size]?.garment_length ?? ""}
                    onChange={(e) => updateSizeGuideField(size, "garment_length", e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="62"
                    value={sizeGuide[size]?.sleeve_length ?? ""}
                    onChange={(e) => updateSizeGuideField(size, "sleeve_length", e.target.value)}
                    style={inputStyle}
                  />
                  <input
                    placeholder="46"
                    value={sizeGuide[size]?.shoulder_width ?? ""}
                    onChange={(e) => updateSizeGuideField(size, "shoulder_width", e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>
          )
      )}

      {product && (
        <div style={{ marginBottom: 24 }}>
          {productImages.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 10, marginBottom: 16 }}>
              {productImages.map((img: any, index: number) => (
                <div key={img.id} style={{ position: "relative", aspectRatio: "1", background: "var(--surface)", border: index === 0 ? "2px solid var(--accent)" : "1px solid var(--line)" }}>
                  {img.media_type === "video" ? (
                    <video src={img.url} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", backgroundImage: `url(${img.url})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                  )}
                  <span
                    onClick={() => handleDeleteImage(img.id)}
                    style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" }}
                  >
                    ✕
                  </span>
                  {img.color && (
                    <span style={{ position: "absolute", bottom: 4, left: 4, fontSize: 10, background: "rgba(0,0,0,0.7)", color: "#fff", padding: "2px 6px" }}>
                      {img.color}
                    </span>
                  )}
                  {index === 0 ? (
                    <span style={{ position: "absolute", top: 4, left: 4, fontSize: 9, fontFamily: "var(--font-label)", textTransform: "uppercase", letterSpacing: "0.04em", background: "var(--accent)", color: "var(--bg)", padding: "2px 6px" }}>
                      Главное
                    </span>
                  ) : (
                    <span
                      onClick={() => handleSetPrimary(img.id)}
                      style={{ position: "absolute", top: 4, left: 4, width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.7)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, cursor: "pointer" }}
                      title="Сделать главным"
                    >
                      ★
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 12 }}>{t.uploadImage}</div>
          <select
            value={imageColor}
            onChange={(e) => setImageColor(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          >
            <option value="">Без привязки к цвету</option>
            {activeColors.map((color) => (
              <option key={color} value={color}>{color}</option>
            ))}
          </select>
          <input type="file" accept="image/*,video/*" multiple onChange={handleImageUpload} disabled={uploadingImage} />
        </div>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ padding: "14px 28px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          {t.save}
        </button>
        {product && (
          <button
            onClick={() => window.open(`/product/${product.id}`, "_blank")}
            style={{ padding: "14px 28px", background: "transparent", color: "var(--text)", border: "1px solid var(--line)", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Предпросмотр
          </button>
        )}
      </div>
    </div>
  );
}

function SupplierPicker({ suppliers, value, onChange, authFetch, refreshSuppliers, inputStyle }: any) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const list: { id: number; name: string; phone: string | null }[] = Array.isArray(suppliers) ? suppliers : [];

  const handleCreate = async () => {
    if (!name.trim()) return;
    const res = await authFetch(`${API}/suppliers/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
    });
    if (res.ok) {
      const created = await res.json();
      await refreshSuppliers();
      onChange(created.id);
      setCreating(false);
      setName("");
      setPhone("");
    }
  };

  if (creating) {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        <input
          placeholder="Имя поставщика"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <input
          placeholder="Телефон (необязательно)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="button"
          onClick={handleCreate}
          style={{ padding: "0 16px", background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer" }}
        >
          ✓
        </button>
        <span
          onClick={() => setCreating(false)}
          style={{ display: "flex", alignItems: "center", cursor: "pointer", color: "var(--text-muted)", padding: "0 8px" }}
        >
          ✕
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
        style={{ ...inputStyle, flex: 1 }}
      >
        <option value="">Без поставщика</option>
        {list.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setCreating(true)}
        style={{ padding: "0 14px", background: "var(--surface)", color: "var(--text)", border: "1px solid var(--line)", cursor: "pointer", whiteSpace: "nowrap" }}
      >
        + новый
      </button>
    </div>
  );
}

function transliterate(text: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya", ғ: "gh", қ: "q", ӣ: "i", ӯ: "u", ҳ: "h", ҷ: "j",
  };
  return text
    .toLowerCase()
    .split("")
    .map((ch) => (map[ch] !== undefined ? map[ch] : ch))
    .join("")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
function CategoriesTab({ t, categories, creatingCategory, setCreatingCategory, authFetch, refreshCategories }: any) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const topLevel = categories.filter((c: Category) => !c.parent_id);

  const [categoryError, setCategoryError] = useState("");
  const handleArchiveCategory = async (id: number) => {
    if (!window.confirm(t.confirmDeleteCategory)) return;
    await authFetch(`${API}/categories/${id}`, { method: "DELETE" });
    refreshCategories();
  };
  const handleRestoreCategory = async (id: number) => {
    await authFetch(`${API}/categories/${id}/restore`, { method: "POST" });
    refreshCategories();
  };
  const handleSave = async () => {
    setCategoryError("");
    if (!name.trim()) {
      setCategoryError("Введите название категории");
      return;
    }
    const baseSlug = transliterate(name);
    const finalSlug = baseSlug || `category-${Date.now()}`;
    const res = await authFetch(`${API}/categories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: finalSlug, parent_id: parentId ? Number(parentId) : null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      if (err?.detail && String(err.detail).includes("duplicate")) {
        const retryRes = await authFetch(`${API}/categories/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug: `${finalSlug}-${Date.now()}`, parent_id: parentId ? Number(parentId) : null }),
        });
        if (!retryRes.ok) {
          setCategoryError("Не удалось сохранить категорию");
          return;
        }
      } else {
        setCategoryError("Не удалось сохранить категорию");
        return;
      }
    }
    setCreatingCategory(false);
    setName("");
    setParentId("");
    refreshCategories();
  };

  return (
    <div>
      {!creatingCategory ? (
        <button
          onClick={() => setCreatingCategory(true)}
          style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          + {t.addCategory}
        </button>
      ) : (
        <div style={{ display: "flex", gap: 10, marginBottom: 24, maxWidth: 640, flexWrap: "wrap" }}>
          <input placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)" }} />
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} style={{ flex: 1, padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)" }}>
            <option value="">Без родителя (основная категория)</option>
            {topLevel.filter((c: Category) => !c.is_archived).map((c: Category) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button onClick={handleSave} style={{ padding: "10px 16px", background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer" }}>{t.save}</button>
          {categoryError && (
            <p style={{ color: "#E24B4A", fontSize: 13, width: "100%", marginTop: 8 }}>
              {categoryError}
            </p>
          )}
        </div>
      )}

      {topLevel.map((parent: Category) => {
        const children = categories.filter((c: Category) => c.parent_id === parent.id);
        return (
          <div key={parent.id}>
            <div style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: parent.is_archived ? 0.5 : 1 }}>
              <span style={{ textDecoration: parent.is_archived ? "line-through" : "none" }}>
                {parent.name} <span style={{ color: "var(--text-muted)" }}>({parent.slug})</span>
                {parent.is_archived && <span style={{ marginLeft: 8, fontSize: 11, color: "#E24B4A" }}>{t.categoryArchivedLabel}</span>}
              </span>
              {parent.is_archived ? (
                <button onClick={() => handleRestoreCategory(parent.id)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", fontSize: 12, cursor: "pointer" }}>{t.restoreCategory}</button>
              ) : (
                <button onClick={() => handleArchiveCategory(parent.id)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--line)", color: "#E24B4A", fontSize: 12, cursor: "pointer" }}>{t.deleteCategory}</button>
              )}
            </div>
            {children.map((child: Category) => (
              <div key={child.id} style={{ padding: "10px 0 10px 24px", borderBottom: "1px solid var(--line)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: child.is_archived ? 0.5 : 1 }}>
                <span style={{ textDecoration: child.is_archived ? "line-through" : "none" }}>
                  — {child.name} <span style={{ color: "var(--text-muted)" }}>({child.slug})</span>
                  {child.is_archived && <span style={{ marginLeft: 8, fontSize: 11, color: "#E24B4A" }}>{t.categoryArchivedLabel}</span>}
                </span>
                {child.is_archived ? (
                  <button onClick={() => handleRestoreCategory(child.id)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--line)", color: "var(--text)", fontSize: 12, cursor: "pointer" }}>{t.restoreCategory}</button>
                ) : (
                  <button onClick={() => handleArchiveCategory(child.id)} style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--line)", color: "#E24B4A", fontSize: 12, cursor: "pointer" }}>{t.deleteCategory}</button>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function FinanceTab({ orders, products, suppliers, authFetch }: any) {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [supplierFilter, setSupplierFilter] = useState<number | "">("");
  const [expenses, setExpenses] = useState<any[]>([]);
  const [expenseTitle, setExpenseTitle] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!unlocked) return;
    authFetch(`${API}/expenses/`)
      .then((r: any) => r.json())
      .then(setExpenses);
  }, [unlocked]);
  const handleAddExpense = () => {
    if (!expenseTitle || !expenseAmount) return;
    authFetch(`${API}/expenses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: expenseTitle, amount: Number(expenseAmount), expense_date: expenseDate }),
    })
      .then((r: any) => r.json())
      .then((newExpense: any) => {
        setExpenses((prev) => [newExpense, ...prev]);
        setExpenseTitle("");
        setExpenseAmount("");
      });
  };
  const handleDeleteExpense = (id: number) => {
    authFetch(`${API}/expenses/${id}`, { method: "DELETE" }).then(() => {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    });
  };
  const handleUnlock = async () => {
    setPinError("");
    const res = await authFetch(`${API}/auth/verify-finance-pin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (res.ok) {
      setUnlocked(true);
    } else {
      setPinError("Неверный PIN");
    }
    setPin("");
  };

  if (!unlocked) {
    return (
      <div style={{ maxWidth: 320, margin: "60px auto", textAlign: "center" }}>
        <div className="product-title" style={{ fontSize: 18, marginBottom: 20 }}>
          Введите PIN для доступа
        </div>
        <input
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
          placeholder="••••••"
          style={{
            width: "100%",
            padding: 14,
            fontSize: 20,
            textAlign: "center",
            letterSpacing: "0.4em",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            color: "var(--text)",
            marginBottom: 14,
          }}
        />
        {pinError && <div style={{ color: "#E24B4A", fontSize: 13, marginBottom: 14 }}>{pinError}</div>}
        <button
          onClick={handleUnlock}
          disabled={pin.length !== 6}
          style={{
            width: "100%",
            padding: 14,
            background: pin.length === 6 ? "var(--text)" : "var(--surface)",
            color: pin.length === 6 ? "var(--bg)" : "var(--text-muted)",
            border: "1px solid var(--line)",
            cursor: pin.length === 6 ? "pointer" : "not-allowed",
            fontSize: 13,
          }}
        >
          Войти
        </button>
      </div>
    );
  }

  // build variantId -> { costPrice, supplierId, productTitle }
  const variantInfo = new Map<number, { costPrice: number | null; supplierId: number | null; title: string }>();
  (Array.isArray(products) ? products : []).forEach((p: Product) => {
    p.variants.forEach((v: any) => {
      variantInfo.set(v.id, { costPrice: p.cost_price, supplierId: p.supplier_id, title: p.title_ru });
    });
  });

  const supplierList: { id: number; name: string }[] = Array.isArray(suppliers) ? suppliers : [];
  const supplierName = (id: number | null) => {
    if (!id) return "Без поставщика";
    return supplierList.find((s) => s.id === id)?.name ?? "Без поставщика";
  };

  const isWithinPeriod = (iso: string): boolean => {
    if (periodFilter === "all") return true;
    const date = new Date(iso);
    const now = new Date();
    if (periodFilter === "today") return date.toDateString() === now.toDateString();
    if (periodFilter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (periodFilter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return date >= monthAgo;
    }
    return true;
  };
  const filteredExpenses = expenses.filter((e: any) => isWithinPeriod(e.expense_date));
  const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  const excludedStatuses = new Set(["cancelled", "returned"]);
  const validOrders = (Array.isArray(orders) ? orders : []).filter(
    (o: Order) => !excludedStatuses.has(o.status) && isWithinPeriod(o.created_at)
  );

  type SupplierAgg = { revenue: number; cost: number; profit: number };
  const bySupplier = new Map<string, SupplierAgg>();
  let totalRevenue = 0;
  let totalCost = 0;

  validOrders.forEach((o: Order) => {
    o.items.forEach((item) => {
      const info = variantInfo.get(item.product_variant_id);
      if (supplierFilter !== "" && info?.supplierId !== supplierFilter) return;

      const revenue = item.price_at_order * item.quantity;
      const cost = (info?.costPrice ?? 0) * item.quantity;
      totalRevenue += revenue;
      totalCost += cost;

      const key = supplierName(info?.supplierId ?? null);
      const agg = bySupplier.get(key) ?? { revenue: 0, cost: 0, profit: 0 };
      agg.revenue += revenue;
      agg.cost += cost;
      agg.profit = agg.revenue - agg.cost;
      bySupplier.set(key, agg);
    });
  });

  const totalProfit = totalRevenue - totalCost - totalExpenses;
  const supplierRows = Array.from(bySupplier.entries()).sort((a, b) => b[1].revenue - a[1].revenue);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as "all" | "today" | "week" | "month")}
          style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
        >
          <option value="all">Период: всё время</option>
          <option value="today">Период: сегодня</option>
          <option value="week">Период: эта неделя</option>
          <option value="month">Период: этот месяц</option>
        </select>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value ? Number(e.target.value) : "")}
          style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
        >
          <option value="">Все поставщики</option>
          {supplierList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Заказов учтено: {validOrders.length} (без отменённых/возвратов)
        </span>
      </div>
      <div className="finance-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 30 }}>
        <div style={{ border: "1px solid var(--line)", padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Выручка</div>
          <div className="price" style={{ fontSize: 22 }}>{totalRevenue.toFixed(0)} смн</div>
        </div>
        <div style={{ border: "1px solid var(--line)", padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Себестоимость проданного</div>
          <div className="price" style={{ fontSize: 22, color: "var(--text-muted)" }}>{totalCost.toFixed(0)} смн</div>
        </div>
        <div style={{ border: "1px solid var(--line)", padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Расходы</div>
          <div className="price" style={{ fontSize: 22, color: "var(--text-muted)" }}>{totalExpenses.toFixed(0)} смн</div>
        </div>
        <div style={{ border: "1px solid var(--accent)", padding: 20 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Прибыль</div>
          <div className="price" style={{ fontSize: 22, color: totalProfit >= 0 ? "#4CAF50" : "#E24B4A" }}>{totalProfit.toFixed(0)} смн</div>
        </div>
      </div>
      <div style={{ marginBottom: 30 }}>
        <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 14 }}>
          Расходы
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <input
            placeholder="Название расхода"
            value={expenseTitle}
            onChange={(e) => setExpenseTitle(e.target.value)}
            style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13, flex: 2, minWidth: 160 }}
          />
          <input
            type="number"
            placeholder="Сумма"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13, flex: 1, minWidth: 100 }}
          />
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
          />
          <button
            onClick={handleAddExpense}
            style={{ padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Добавить
          </button>
        </div>
        {filteredExpenses.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Расходов за этот период нет</p>
        ) : (
          <div>
            {filteredExpenses.map((e: any) => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <span style={{ fontSize: 13 }}>{e.expense_date} — {e.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{Number(e.amount).toFixed(0)} смн</span>
                  <span
                    onClick={() => handleDeleteExpense(e.id)}
                    style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12, textDecoration: "underline" }}
                  >
                    Удалить
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 14 }}>
        По поставщикам
      </div>
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--line)" }}>
            <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Поставщик</th>
            <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Выручка</th>
            <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Себестоимость</th>
            <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Прибыль</th>
          </tr>
        </thead>
        <tbody>
          {supplierRows.map(([name, agg]) => (
            <tr key={name} style={{ borderBottom: "1px solid var(--line)" }}>
              <td style={{ padding: "8px" }}>{name}</td>
              <td style={{ padding: "8px" }}>{agg.revenue.toFixed(0)} смн</td>
              <td style={{ padding: "8px", color: "var(--text-muted)" }}>{agg.cost.toFixed(0)} смн</td>
              <td style={{ padding: "8px", color: agg.profit >= 0 ? "#4CAF50" : "#E24B4A" }}>{agg.profit.toFixed(0)} смн</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function QuickDraftsTab({ authFetch }: any) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    authFetch(`${API}/quick-drafts/`)
      .then((r: any) => r.json())
      .then((data: any) => {
        setDrafts(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleDelete = (id: number) => {
    if (!confirm("Удалить этот быстрый черновик?")) return;
    authFetch(`${API}/quick-drafts/${id}`, { method: "DELETE" }).then(() => {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    });
  };

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Загрузка...</p>;
  if (drafts.length === 0) return <p style={{ color: "var(--text-muted)" }}>Быстрых черновиков пока нет</p>;

  return (
    <div>
      <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16, color: "var(--text-muted)" }}>
        Быстрые черновики ({drafts.length})
      </div>
      {drafts.map((d) => (
        <div key={d.id} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
          {d.image_url && (
            <div
              style={{
                width: 140,
                height: 180,
                flexShrink: 0,
                backgroundImage: `url(${d.image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                border: "1px solid var(--line)",
              }}
            />
          )}
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="product-title" style={{ fontSize: 17 }}>{d.title}</span>
              <span
                onClick={() => handleDelete(d.id)}
                style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12, textDecoration: "underline" }}
              >
                Удалить
              </span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Закуп: {d.cost_price ?? "—"} смн · Цена: {d.price ?? "—"} смн
            </div>
            {(d.colors ?? []).map((c: any, idx: number) => {
              const hex = getColorHex(c.color);
              return (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 20,
                        background: hex,
                        color: getContrastText(hex),
                        fontSize: 12,
                      }}
                    >
                      {c.color}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      ({c.size_type === "letter" ? "буквенный" : c.size_type === "numeric" ? "числовой" : c.size_type === "onesize" ? "безразмерный" : "свой"})
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {(c.sizes ?? []).map((s: any, i: number) => (
                      <span
                        key={i}
                        style={{ padding: "4px 8px", background: "var(--surface)", border: "1px solid var(--line)", fontSize: 12 }}
                      >
                        {s.size}: {s.stock} шт
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {(d.size_guide ?? []).length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>Гид по размерам:</div>
                {d.size_guide.map((g: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                    <strong>{g.size}</strong>: грудь {g.chest || "—"}, талия {g.waist || "—"}, длина {g.garment_length || "—"}, рукав {g.sleeve_length || "—"}, плечи {g.shoulder_width || "—"}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
function WarehouseTab({ products, suppliers, incomingMovements }: any) {
  const [supplierFilter, setSupplierFilter] = useState<number | "">("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [sortMode, setSortMode] = useState<"stock" | "date" | "name">("stock");

  const supplierList: { id: number; name: string }[] = Array.isArray(suppliers) ? suppliers : [];
  const supplierName = (id: number | null) => {
    if (!id) return "—";
    return supplierList.find((s) => s.id === id)?.name ?? "—";
  };

  const movements: { product_variant_id: number; created_at: string }[] = Array.isArray(incomingMovements) ? incomingMovements : [];
  const lastIncomingDate = (variantId: number): string | null => {
    const matches = movements.filter((m) => m.product_variant_id === variantId);
    if (matches.length === 0) return null;
    return matches.reduce((latest, m) => (m.created_at > latest ? m.created_at : latest), matches[0].created_at);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ru-RU");
  };

  const variantRows: {
    productId: number;
    title: string;
    catalogNumber: string;
    size: string;
    color: string;
    stock: number;
    costPrice: number | null;
    supplierId: number | null;
    lastIncoming: string | null;
  }[] = [];

  (Array.isArray(products) ? products : []).forEach((p: Product) => {
    p.variants.forEach((v: any) => {
      variantRows.push({
        productId: p.id,
        title: p.title_ru,
        catalogNumber: p.catalog_number,
        size: v.size,
        color: v.color,
        stock: v.stock,
        costPrice: p.cost_price,
        supplierId: p.supplier_id,
        lastIncoming: lastIncomingDate(v.id),
      });
    });
  });

  const isWithinPeriod = (iso: string | null): boolean => {
    if (periodFilter === "all") return true;
    if (!iso) return false;
    const date = new Date(iso);
    const now = new Date();
    if (periodFilter === "today") {
      return date.toDateString() === now.toDateString();
    }
    if (periodFilter === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    }
    if (periodFilter === "month") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(now.getMonth() - 1);
      return date >= monthAgo;
    }
    return true;
  };

  const filteredVariantRows = variantRows
    .filter((r) => (supplierFilter === "" ? true : r.supplierId === supplierFilter))
    .filter((r) => (lowStockOnly ? r.stock <= 2 : true))
    .filter((r) => isWithinPeriod(r.lastIncoming));

  // Grouped-by-product view (used when sorting by name): one row per product, stock summed across variants
  const groupedRows: {
    productId: number;
    title: string;
    catalogNumber: string;
    stock: number;
    costPrice: number | null;
    supplierId: number | null;
    lastIncoming: string | null;
  }[] = [];
  const groupMap = new Map<number, typeof groupedRows[number]>();
  filteredVariantRows.forEach((r) => {
    const existing = groupMap.get(r.productId);
    if (existing) {
      existing.stock += r.stock;
      if (r.lastIncoming && (!existing.lastIncoming || r.lastIncoming > existing.lastIncoming)) {
        existing.lastIncoming = r.lastIncoming;
      }
    } else {
      const entry = {
        productId: r.productId,
        title: r.title,
        catalogNumber: r.catalogNumber,
        stock: r.stock,
        costPrice: r.costPrice,
        supplierId: r.supplierId,
        lastIncoming: r.lastIncoming,
      };
      groupMap.set(r.productId, entry);
      groupedRows.push(entry);
    }
  });

  const isGrouped = sortMode === "name";

  const sortedVariantRows = [...filteredVariantRows].sort((a, b) => {
    if (sortMode === "stock") return a.stock - b.stock;
    if (!a.lastIncoming && !b.lastIncoming) return 0;
    if (!a.lastIncoming) return 1;
    if (!b.lastIncoming) return -1;
    return b.lastIncoming.localeCompare(a.lastIncoming);
  });

  const sortedGroupedRows = [...groupedRows].sort((a, b) => a.title.localeCompare(b.title, "ru"));

  const totalStock = filteredVariantRows.reduce((sum, r) => sum + r.stock, 0);
  const totalValue = filteredVariantRows.reduce((sum, r) => sum + r.stock * (r.costPrice ?? 0), 0);
  const positionCount = isGrouped ? sortedGroupedRows.length : sortedVariantRows.length;

  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const data = isGrouped
      ? sortedGroupedRows.map((r) => ({
          "Товар": r.title,
          "Артикул": r.catalogNumber,
          "Остаток (всего)": r.stock,
          "Себестоимость": r.costPrice ?? "",
          "Поставщик": supplierName(r.supplierId),
          "Дата поступления": formatDate(r.lastIncoming),
        }))
      : sortedVariantRows.map((r) => ({
          "Товар": r.title,
          "Артикул": r.catalogNumber,
          "Размер": r.size,
          "Цвет": r.color,
          "Остаток": r.stock,
          "Себестоимость": r.costPrice ?? "",
          "Поставщик": supplierName(r.supplierId),
          "Дата поступления": formatDate(r.lastIncoming),
        }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Склад");
    XLSX.writeFile(wb, `sklad_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 20, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value ? Number(e.target.value) : "")}
          style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
        >
          <option value="">Все поставщики</option>
          {supplierList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as "stock" | "date" | "name")}
          style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
        >
          <option value="stock">Сортировка: по остатку (по вариантам)</option>
          <option value="date">Сортировка: по дате поступления (по вариантам)</option>
          <option value="name">Сортировка: по названию (сумма по товару)</option>
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Только с низким остатком (≤2)
        </label>
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value as "all" | "today" | "week" | "month")}
          style={{ padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
        >
          <option value="all">Период: всё время</option>
          <option value="today">Период: сегодня</option>
          <option value="week">Период: эта неделя</option>
          <option value="month">Период: этот месяц</option>
        </select>
        <button
          onClick={handleExportExcel}
          style={{ padding: "10px 16px", background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer", fontSize: 13 }}
        >
          Экспорт в Excel
        </button>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "var(--text-muted)" }}>
          Позиций: {positionCount} · Штук: {totalStock} · Сумма по себестоимости: {totalValue.toFixed(0)} смн
        </span>
      </div>

      {isGrouped ? (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Товар</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Артикул</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Остаток (всего)</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Себестоимость</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Поставщик</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Дата поступления</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroupedRows.map((r) => (
              <tr key={r.productId} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px" }}>{r.title}</td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{r.catalogNumber}</td>
                <td style={{ padding: "8px", color: r.stock <= 2 ? "#E24B4A" : "var(--text)", fontWeight: r.stock <= 2 ? 600 : 400 }}>
                  {r.stock}
                </td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{r.costPrice ?? "—"}</td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{supplierName(r.supplierId)}</td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{formatDate(r.lastIncoming)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      ) : (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--line)" }}>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Товар</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Артикул</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Размер</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Цвет</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Остаток</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Себестоимость</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Поставщик</th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Дата поступления</th>
            </tr>
          </thead>
          <tbody>
            {sortedVariantRows.map((r, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid var(--line)" }}>
                <td style={{ padding: "8px" }}>{r.title}</td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{r.catalogNumber}</td>
                <td style={{ padding: "8px" }}>{r.size}</td>
                <td style={{ padding: "8px" }}>{r.color}</td>
                <td style={{ padding: "8px", color: r.stock <= 2 ? "#E24B4A" : "var(--text)", fontWeight: r.stock <= 2 ? 600 : 400 }}>
                  {r.stock}
                </td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{r.costPrice ?? "—"}</td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{supplierName(r.supplierId)}</td>
                <td style={{ padding: "8px", color: "var(--text-muted)" }}>{formatDate(r.lastIncoming)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  confirmed: "Подтверждён",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  returned: "Возврат",
};

function OrdersTab({ t, orders, authFetch, refreshOrders }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const handleStatusChange = async (orderId: number, status: string) => {
    await authFetch(`${API}/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    refreshOrders();
  };
  const query = searchQuery.trim().toLowerCase();
  const searchedOrders = query
    ? orders.filter((o: Order) => {
        if (String(o.id).includes(query)) return true;
        return o.items.some((item) => {
          const v = item.variant;
          if (!v) return false;
          return (
            v.title_ru?.toLowerCase().includes(query) ||
            v.title_tj?.toLowerCase().includes(query) ||
            v.catalog_number?.toLowerCase().includes(query)
          );
        });
      })
    : orders;
  const filteredOrders = statusFilter
    ? searchedOrders.filter((o: Order) => o.status === statusFilter)
    : searchedOrders;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          placeholder="Поиск по номеру заказа, названию или артикулу"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ padding: 12, width: "100%", maxWidth: 420, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14 }}
        >
          <option value="">Все статусы</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Найдено: {filteredOrders.length}
      </div>
      {pagedOrders.length === 0 && <p style={{ color: "var(--text-muted)" }}>{t.noOrders}</p>}
      {pagedOrders.map((o: Order) => (
        <div key={o.id} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="product-title" style={{ fontSize: 16 }}>Заказ №{o.id}</span>
            <span className="price">{o.total} смн</span>
          </div>
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 6 }}>
            {new Date(o.created_at).toLocaleDateString("ru-RU")}
          </div>
          <div style={{ fontSize: 14, marginBottom: 6 }}>
            {o.customer?.name || "Без имени"} · {o.customer?.phone}
          </div>
          {o.delivery_address && <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 10 }}>{o.delivery_address}</p>}
          {o.comment && <p style={{ color: "var(--accent)", fontSize: 13, marginBottom: 10 }}>💬 {o.comment}</p>}
          <div style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", padding: "10px 0", marginBottom: 10 }}>
            {o.items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span>
                  {item.variant ? item.variant.title_ru : "Товар удалён"}
                  {item.variant && ` · ${t.catalogNumber} ${item.variant.catalog_number} · ${item.variant.color}, ${item.variant.size}`}
                  {" × "}{item.quantity}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{item.price_at_order} смн</span>
              </div>
            ))}
          </div>
          <select
            value={o.status}
            onChange={(e) => handleStatusChange(o.id, e.target.value)}
            style={{ padding: 8, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 13 }}
          >
            {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      ))}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center", marginTop: 20 }}>
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
          >
            ← Назад
          </button>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Страница {currentPage} из {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{ padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
  );
}
