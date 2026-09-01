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
    logout: "Выйти",
    addProduct: "Добавить товар",
    addCategory: "Добавить категорию",
    name: "Название",
    slug: "Слаг (латиницей)",
    save: "Сохранить",
    cancel: "Отмена",
    price: "Цена",
    catalogNumber: "Кат. №",
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
    logout: "Баромадан",
    addProduct: "Иловаи мол",
    addCategory: "Иловаи категория",
    name: "Ном",
    slug: "Слаг (бо ҳарфҳои лотинӣ)",
    save: "Нигоҳ доштан",
    cancel: "Бекор кардан",
    price: "Нарх",
    catalogNumber: "Кат. №",
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

type Category = { id: number; name: string; slug: string };

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
  discount_percent: number | null;
};

type Order = {
  id: number;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string | null;
  comment: string | null;
  payment_method: string | null;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function AdminPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const t = labels[lang];

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [tab, setTab] = useState<"products" | "categories" | "orders">("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    fetch(`${API}/categories/`).then((r) => r.json()).then(setCategories);
    authFetch(`${API}/orders/`).then((r) => (r.ok ? r.json() : [])).then(setOrders);
  }, [token]);

  const refreshProducts = () =>
    authFetch(`${API}/products/admin/all`).then((r) => {
      if (r.status === 401) {
        handleLogout();
        return [];
      }
      return r.ok ? r.json() : [];
    }).then(setProducts);
  const refreshCategories = () => fetch(`${API}/categories/`).then((r) => r.json()).then(setCategories);

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

      <div style={{ display: "flex", gap: 30, padding: "20px 40px", borderBottom: "1px solid var(--line)" }}>
        {(["products", "categories", "orders"] as const).map((tabName) => (
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
        {tab === "products" && (
          <ProductsTab
            t={t}
            products={products}
            categories={categories}
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
        {tab === "orders" && <OrdersTab t={t} orders={orders} authFetch={authFetch} lang={lang} />}
      </div>
    </div>
  );
}

function getAdminBadgeSrc(p: Product): string | null {
  if (p.discount_percent) {
    const steps = [5, 10, 15, 20];
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

function ProductsTab({ t, products, categories, selectedProduct, setSelectedProduct, creatingProduct, setCreatingProduct, authFetch, refreshProducts, token }: any) {
  const productList: Product[] = Array.isArray(products) ? products : [];
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  if (selectedProduct || creatingProduct) {
    return (
      <ProductForm
        t={t}
        product={selectedProduct}
        categories={categories}
        authFetch={authFetch}
        onClose={() => {
          setSelectedProduct(null);
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
      <button
        onClick={() => setCreatingProduct(true)}
        style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
      >
        + {t.addProduct}
      </button>

      {productList.length === 0 && <p style={{ color: "var(--text-muted)" }}>{t.noProducts}</p>}

      {draftProducts.length > 0 && (
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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {draftProducts.map((p) => renderCard(p, true))}
          </div>
        </div>
      )}

      {publishedProducts.length > 0 && (
        <div>
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16, color: "var(--text-muted)" }}>
            Опубликовано ({publishedProducts.length})
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 20 }}>
            {publishedProducts.map((p) => renderCard(p, false))}
          </div>
        </div>
      )}
    </div>
  );
}
function ProductForm({ t, product, categories, authFetch, onClose }: any) {
  const [form, setForm] = useState({
    category_id: product?.category_id ?? categories[0]?.id ?? 1,
    title_ru: product?.title_ru ?? "",
    title_tj: product?.title_tj ?? "",
    description_ru: product?.description_ru ?? "",
    description_tj: product?.description_tj ?? "",
    price: product?.price ?? "",
    material_ru: product?.material_ru ?? "",
    material_tj: product?.material_tj ?? "",
    country_of_origin_ru: product?.country_of_origin_ru ?? "",
    country_of_origin_tj: product?.country_of_origin_tj ?? "",
    care_instructions_ru: product?.care_instructions_ru ?? "",
    care_instructions_tj: product?.care_instructions_tj ?? "",
    badgeType: (product?.discount_percent ? "discount" : product?.is_new ? "new" : product?.is_featured ? "featured" : "none") as "none" | "featured" | "new" | "discount",
    discount_percent: product?.discount_percent ?? "",
    discount_from: product?.discount_from ?? "",
    discount_to: product?.discount_to ?? "",
  });
  const [variants, setVariants] = useState<{ size: string; color: string; stock: number }[]>(
    product?.variants ?? []
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImages, setProductImages] = useState(product?.images ?? []);

  const updateField = (key: string, value: any) => setForm({ ...form, [key]: value });

  const addVariant = () => setVariants([...variants, { size: "", color: "", stock: 0 }]);
  const updateVariant = (idx: number, key: string, value: any) => {
    const next = [...variants];
    (next[idx] as any)[key] = value;
    setVariants(next);
  };

  const handleSave = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const { badgeType, ...restForm } = form;
      const payload = {
        ...restForm,
        price: Number(form.price),
        is_featured: badgeType === "featured",
        is_new: badgeType === "new",
        discount_percent: badgeType === "discount" && form.discount_percent !== "" ? Number(form.discount_percent) : null,
        discount_from: badgeType === "discount" && form.discount_from !== "" ? form.discount_from : null,
        discount_to: badgeType === "discount" && form.discount_to !== "" ? form.discount_to : null,
        is_active: product ? product.is_active : false,
        variants,
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
      onClose();
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const [imageColor, setImageColor] = useState("");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product || !e.target.files?.[0]) return;
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    try {
      const url = imageColor
        ? `${API}/upload/product-image/${product.id}?color=${encodeURIComponent(imageColor)}`
        : `${API}/upload/product-image/${product.id}`;
      const res = await authFetch(url, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const newImage = await res.json();
        setProductImages((prev: any[]) => [...prev, newImage]);
      }
      setImageColor("");
      e.target.value = "";
    } finally {
      setUploadingImage(false);
    }
  };

  const inputStyle = { padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14, width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: 700 }}>
      <span onClick={onClose} style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)", display: "block", marginBottom: 20 }}>
        ← {t.cancel}
      </span>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.name} (RU)`} value={form.title_ru} onChange={(e) => updateField("title_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.name} (TJ) — авто, можно поправить`} value={form.title_tj} onChange={(e) => updateField("title_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <textarea placeholder={`${t.description} (RU)`} value={form.description_ru} onChange={(e) => updateField("description_ru", e.target.value)} rows={3} style={inputStyle} />
        <textarea placeholder={`${t.description} (TJ)`} value={form.description_tj} onChange={(e) => updateField("description_tj", e.target.value)} rows={3} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input type="number" placeholder={t.price} value={form.price} onChange={(e) => updateField("price", e.target.value)} style={inputStyle} />
        <select value={form.category_id} onChange={(e) => updateField("category_id", Number(e.target.value))} style={inputStyle}>
          {categories.map((c: Category) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.material} (RU)`} value={form.material_ru} onChange={(e) => updateField("material_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.material} (TJ)`} value={form.material_tj} onChange={(e) => updateField("material_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <input placeholder={`${t.country} (RU)`} value={form.country_of_origin_ru} onChange={(e) => updateField("country_of_origin_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.country} (TJ)`} value={form.country_of_origin_tj} onChange={(e) => updateField("country_of_origin_tj", e.target.value)} style={inputStyle} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <input placeholder={`${t.care} (RU)`} value={form.care_instructions_ru} onChange={(e) => updateField("care_instructions_ru", e.target.value)} style={inputStyle} />
        <input placeholder={`${t.care} (TJ)`} value={form.care_instructions_tj} onChange={(e) => updateField("care_instructions_tj", e.target.value)} style={inputStyle} />
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
      {variants.map((v, idx) => (
        <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
          <input placeholder={t.size} value={v.size} onChange={(e) => updateVariant(idx, "size", e.target.value)} style={inputStyle} />
          <input placeholder={t.color} value={v.color} onChange={(e) => updateVariant(idx, "color", e.target.value)} style={inputStyle} />
          <input type="number" placeholder={t.stock} value={v.stock} onChange={(e) => updateVariant(idx, "stock", Number(e.target.value))} style={inputStyle} />
        </div>
      ))}
      <span onClick={addVariant} style={{ cursor: "pointer", color: "var(--accent)", fontSize: 13, display: "block", marginBottom: 24 }}>
        + {t.addVariant}
      </span>

      {product && (
        <div style={{ marginBottom: 24 }}>
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 12 }}>{t.uploadImage}</div>
          <input
            type="text"
            placeholder="Цвет фото (например: Серый) — необязательно"
            value={imageColor}
            onChange={(e) => setImageColor(e.target.value)}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{ padding: "14px 28px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
      >
        {t.save}
      </button>
    </div>
  );
}

function CategoriesTab({ t, categories, creatingCategory, setCreatingCategory, authFetch, refreshCategories }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const handleSave = async () => {
    await authFetch(`${API}/categories/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, parent_id: null }),
    });
    setCreatingCategory(false);
    setName("");
    setSlug("");
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
        <div style={{ display: "flex", gap: 10, marginBottom: 24, maxWidth: 500 }}>
          <input placeholder={t.name} value={name} onChange={(e) => setName(e.target.value)} style={{ flex: 1, padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)" }} />
          <input placeholder={t.slug} value={slug} onChange={(e) => setSlug(e.target.value)} style={{ flex: 1, padding: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)" }} />
          <button onClick={handleSave} style={{ padding: "10px 16px", background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer" }}>{t.save}</button>
        </div>
      )}

      {categories.map((c: Category) => (
        <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
          {c.name} <span style={{ color: "var(--text-muted)" }}>({c.slug})</span>
        </div>
      ))}
    </div>
  );
}

function OrdersTab({ t, orders }: any) {
  if (orders.length === 0) return <p style={{ color: "var(--text-muted)" }}>{t.noOrders}</p>;

  return (
    <div>
      {orders.map((o: Order) => (
        <div key={o.id} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="product-title" style={{ fontSize: 16 }}>Заказ №{o.id}</span>
            <span className="price">{o.total} смн</span>
          </div>
          <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 6 }}>
            {o.status} · {new Date(o.created_at).toLocaleDateString("ru-RU")}
          </div>
          {o.delivery_address && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{o.delivery_address}</p>}
        </div>
      ))}
    </div>
  );
}