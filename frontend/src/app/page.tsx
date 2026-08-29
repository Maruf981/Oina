"use client";

import { useEffect, useState } from "react";
import { translations, Lang } from "./translations";
import { useCart } from "./cart-context";
import { useAuth } from "./auth-context";
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
  variants: Variant[];
  images: ProductImage[];
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
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
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const localized = (ru: string, tj: string | null) => (lang === "tj" && tj ? tj : ru);

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
      const res = await fetch("http://127.0.0.1:8000/orders/", {
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
  };

  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (minPrice) params.set("min_price", minPrice);
    if (maxPrice) params.set("max_price", maxPrice);
    if (filterSize) params.set("size", filterSize);
    if (filterColor) params.set("color", filterColor);

    fetch(`http://127.0.0.1:8000/products/?${params.toString()}`)
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
    <div data-theme={theme} style={{ maxWidth: 1200, margin: "0 auto", background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "24px 40px",
          borderBottom: "1px solid var(--line)",
          background: "var(--bg)",
        }}
      >
        <div
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            cursor: "pointer",
            width: 22,
          }}
        >
          <span style={{ height: 1, background: "var(--text)" }} />
          <span style={{ height: 1, background: "var(--text)" }} />
          <span style={{ height: 1, background: "var(--text)" }} />
        </div>
        <img
          src={theme === "dark" ? "/logo.png" : "/logo-light.png"}
          alt="Oina.tj"
          style={{ height: 72 }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
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
          </div>
          <div
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
            }}
            title="Переключить тему"
          >
            <span style={{ fontSize: 10 }}>{theme === "dark" ? "☀" : "☾"}</span>
          </div>
          <div
            onClick={() => (auth.customer ? router.push("/account") : setAuthOpen(true))}
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-label)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {auth.customer ? auth.customer.name || "Профиль" : lang === "ru" ? "Войти" : "Даромадан"}
          </div>
          <div
            onClick={() => setCartOpen(true)}
            style={{
              cursor: "pointer",
              fontFamily: "var(--font-label)",
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {t.cart} ({cart.totalCount})
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
        <div style={{ padding: "32px 40px", borderBottom: "1px solid var(--line)" }}>
          <div
            className="catalog-label"
            style={{ border: "none", padding: 0, marginBottom: 16 }}
          >
            {t.categories}
          </div>
          <div style={{ display: "flex", gap: 40 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t.women}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t.men}</span>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{t.kids}</span>
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

      <div style={{ padding: "0 40px 40px" }}>
        <h2 className="product-title" style={{ fontSize: 26, padding: "32px 0 24px" }}>
          {t.newArrivals}
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
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
                onClick={() => router.push(`/product/${p.id}`)}
                style={{
                  aspectRatio: "3/4",
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  marginBottom: 14,
                  cursor: "pointer",
                  backgroundImage: p.images[0] ? `url(${p.images[0].url})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div
                onClick={() => router.push(`/product/${p.id}`)}
                className="product-title"
                style={{ fontSize: 17, marginBottom: 10, cursor: "pointer" }}
              >
                {localized(p.title_ru, p.title_tj)}
              </div>
              <div className="catalog-label" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <span>{t.catalogNumber} {p.catalog_number}</span>
                <span className="price">{p.price} смн</span>
              </div>

              {p.variants.length > 0 && (
                <select
                  value={selectedSizes[p.id] ?? p.variants[0].id}
                  onChange={(e) =>
                    setSelectedSizes({ ...selectedSizes, [p.id]: Number(e.target.value) })
                  }
                  style={{
                    width: "100%",
                    marginBottom: 10,
                    padding: "8px",
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--line)",
                    fontFamily: "var(--font-label)",
                    fontSize: 12,
                  }}
                >
                  {p.variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.stock === 0}>
                      {v.size} / {v.color} {v.stock === 0 ? "— нет в наличии" : ""}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => handleAddToCart(p)}
                disabled={p.variants.length === 0}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "var(--text)",
                  color: "var(--bg)",
                  border: "none",
                  fontFamily: "var(--font-label)",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                {t.cart}
              </button>
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
    </div>
  );
}