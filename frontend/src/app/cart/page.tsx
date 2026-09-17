"use client";

import "../hero.css";
import "./cart.css";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../auth-context";
import { useCart } from "../cart-context";
import { SiteHeader } from "../site-header";
import { useLang } from "../lang-context";
import { translations } from "../translations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function isValidPhone(phone: string): boolean {
  return /^(\+992\d{9}|\d{9})$/.test(phone.trim());
}

type ProductImage = { url: string; media_type?: string };
type ProductForImages = { id: number; images: ProductImage[] };

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartInner />
    </Suspense>
  );
}

function CartInner() {
  const auth = useAuth();
  const cart = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLang();
  const t = translations[lang];
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);

  const [checkoutStep, setCheckoutStep] = useState<"cart" | "form" | "payment" | "done">("cart");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [orderComment, setOrderComment] = useState("");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card">("qr");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<number, string>>({});

  useEffect(() => {
    if (searchParams.get("checkout") === "1" && cart.items.length > 0) setCheckoutStep("form");
  }, [searchParams, cart.items.length]);

  useEffect(() => {
    if (!auth.customer) return;
    if (!customerName && auth.customer.name) setCustomerName(auth.customer.name);
    if (!customerPhone && auth.customer.phone) setCustomerPhone(auth.customer.phone);
    if (!deliveryAddress && auth.customer.address) setDeliveryAddress(auth.customer.address);
  }, [auth.customer]);

  useEffect(() => {
    const ids = Array.from(new Set(cart.items.map((i) => i.productId)));
    if (ids.length === 0) return;
    fetch(`${API_URL}/products/?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data: ProductForImages[]) => {
        const map: Record<number, string> = {};
        data.forEach((p) => {
          const thumb = p.images?.find((img) => img.media_type !== "video");
          if (thumb) map[p.id] = thumb.url;
        });
        setProductImages(map);
      })
      .catch(() => setProductImages({}));
  }, [cart.items]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [checkoutStep]);

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
      setOrderTotal(cart.totalPrice);
      await cart.clearCart();
      setOrderNumber(order.id);
      setCheckoutStep("payment");
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "";
      const friendlyMsg = msg.includes("В наличии только")
        ? msg
        : tr("Ошибка оформления заказа. Попробуйте ещё раз.", "Хатогӣ ҳангоми фармоиш. Бори дигар кӯшиш кунед.");
      setToastMessage(friendlyMsg);
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setPlacing(false);
    }
  };

  const steps = [
    { key: "cart", label: tr("Корзина", "Сабад") },
    { key: "form", label: tr("Доставка", "Расонидан") },
    { key: "payment", label: tr("Оплата", "Пардохт") },
    { key: "done", label: tr("Готово", "Тайёр") },
  ];
  const stepIndex = steps.findIndex((s) => s.key === checkoutStep);

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    error: string | null,
    placeholder?: string,
  ) => (
    <label className={`ck-field${error ? " has-error" : ""}`}>
      <span className="ck-field-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {error && <span className="ck-error">{error}</span>}
    </label>
  );

  const summary = (
    <aside className="ck-summary">
      <div className="ck-label">{tr("Ваш заказ", "Фармоиши шумо")} ({cart.totalCount})</div>
      <div className="ck-sum-list">
        {cart.items.map((item) => (
          <div key={item.variantId} className="ck-sum-item">
            <div className="ck-sum-img">{productImages[item.productId] && <img src={productImages[item.productId]} alt={item.title} />}</div>
            <div className="ck-sum-info">
              <div className="ck-meta">{item.size} · {item.color} · ×{item.qty}</div>
              <div className="ck-sum-title">{item.title}</div>
            </div>
            <div className="ck-sum-price">{item.price * item.qty} смн</div>
          </div>
        ))}
      </div>
      <div className="ck-sum-row"><span>{tr("Товары", "Молҳо")}</span><span>{cart.totalPrice} смн</span></div>
      <div className="ck-sum-row"><span>{tr("Доставка", "Расонидан")}</span><span>{tr("Уточнит оператор", "Оператор мегӯяд")}</span></div>
      <div className="ck-sum-total"><span>{tr("Итого", "Ҳамагӣ")}</span><span>{cart.totalPrice} смн</span></div>
    </aside>
  );

  return (
    <div className="ck-root">
      <SiteHeader />
      <div className="ck">
        <div className="ck-head">
          <span className="coll-rule" />
          <div className="ck-eyebrow">{tr("Оформление", "Фармоиш")}</div>
          <h1 className="ck-title">
            {checkoutStep === "cart" && tr("Ваша корзина", "Сабади шумо")}
            {checkoutStep === "form" && tr("Доставка", "Расонидан")}
            {checkoutStep === "payment" && tr("Оплата", "Пардохт")}
            {checkoutStep === "done" && tr("Спасибо", "Ташаккур")}
          </h1>
          <ol className="ck-steps">
            {steps.map((s, i) => (
              <li key={s.key} className={i === stepIndex ? "is-active" : i < stepIndex ? "is-done" : ""}>
                <span>{String(i + 1).padStart(2, "0")}</span> {s.label}
              </li>
            ))}
          </ol>
        </div>

        {checkoutStep === "cart" && (
          cart.items.length === 0 ? (
            <div className="ck-empty">
              <p>{tr("В корзине пока пусто", "Сабад холӣ аст")}</p>
              <button className="ck-btn ck-btn--outline" onClick={() => router.push("/")}>{tr("Перейти в каталог", "Ба каталог")}</button>
            </div>
          ) : (
            <div className="ck-grid">
              <div className="ck-list">
                <div className="ck-list-head">
                  <span>{tr("Товар", "Мол")}</span>
                  <span>{tr("Количество", "Миқдор")}</span>
                  <span>{tr("Сумма", "Маблағ")}</span>
                </div>
                {cart.items.map((item) => (
                  <div key={item.variantId} className="ck-item">
                    <div className="ck-item-main">
                      <div className="ck-img" onClick={() => router.push(`/product/${item.productId}`)}>
                        {productImages[item.productId] && <img src={productImages[item.productId]} alt={item.title} />}
                      </div>
                      <div>
                        <div className="ck-meta">{item.size} · {item.color}</div>
                        <div className="ck-item-title" onClick={() => router.push(`/product/${item.productId}`)}>{item.title}</div>
                        <div className="ck-item-unit">{item.price} смн</div>
                        <span className="ck-remove" onClick={() => cart.removeItem(item.variantId)}>{tr("Удалить", "Нест кардан")}</span>
                      </div>
                    </div>
                    <div className="ck-qty">
                      <button onClick={() => cart.updateQty(item.variantId, item.qty - 1)}>−</button>
                      <span>{item.qty}</span>
                      <button onClick={() => cart.updateQty(item.variantId, item.qty + 1)}>+</button>
                    </div>
                    <div className="ck-item-sum">{item.price * item.qty} смн</div>
                  </div>
                ))}
                <div className="ck-list-foot">
                  <span className="ck-link" onClick={() => router.push("/")}>{tr("Продолжить покупки", "Идомаи харид")}</span>
                  <span className="ck-link ck-link--muted" onClick={() => cart.clearCart()}>{tr("Очистить корзину", "Холӣ кардан")}</span>
                </div>
              </div>

              <aside className="ck-summary ck-summary--cart">
                <div className="ck-sum-total ck-sum-total--big"><span>{tr("Итого", "Ҳамагӣ")}</span><span>{cart.totalPrice} смн</span></div>
                <p className="ck-note">{tr("Стоимость доставки уточнится при оформлении.", "Нархи расонидан ҳангоми фармоиш муайян мешавад.")}</p>
                <button className="ck-btn" onClick={() => setCheckoutStep("form")}>{tr("Оформить заказ", "Фармоиш додан")}</button>
                <p className="ck-note ck-note--center">{tr("Доставка за 24 часа по Душанбе", "Расонидан дар 24 соат дар Душанбе")}</p>
              </aside>
            </div>
          )
        )}

        {checkoutStep === "form" && (
          <div className="ck-grid">
            <div className="ck-form">
              <div className="ck-label">{tr("Контактные данные", "Маълумоти тамос")}</div>
              {field(`${t.checkoutName} *`, customerName, setCustomerName, attemptedSubmit && !customerName ? t.checkoutFillField : null)}
              {field(
                tr("Телефон *", "Телефон *"),
                customerPhone,
                setCustomerPhone,
                customerPhone && !isValidPhone(customerPhone)
                  ? tr("Формат: +992ХХХХХХХХХ или 900ХХХХХХ", "Формат: +992ХХХХХХХХХ ё 900ХХХХХХ")
                  : attemptedSubmit && !customerPhone ? t.checkoutFillField : null,
                "+992",
              )}

              <div className="ck-label ck-label--gap">{tr("Адрес доставки", "Суроғаи расонидан")}</div>
              {field(`${t.checkoutAddress} *`, deliveryAddress, setDeliveryAddress, attemptedSubmit && !deliveryAddress ? t.checkoutFillField : null)}
              {field(`${t.checkoutLandmark} *`, landmark, setLandmark, attemptedSubmit && !landmark ? t.checkoutFillField : null)}
              <label className="ck-field">
                <span className="ck-field-label">{tr("Комментарий", "Шарҳ")}</span>
                <textarea value={orderComment} onChange={(e) => setOrderComment(e.target.value)} placeholder={t.checkoutCommentPlaceholder} rows={3} />
              </label>

              <div className="ck-label ck-label--gap">{t.checkoutPaymentMethod}</div>
              <div className="ck-pay">
                <button className={`ck-pay-opt${paymentMethod === "qr" ? " is-active" : ""}`} onClick={() => setPaymentMethod("qr")}>
                  <span className="ck-radio" />
                  <span>{tr("QR-код", "QR-код")}</span>
                </button>
                <button
                  className={`ck-pay-opt${paymentMethod === "card" ? " is-active" : ""}`}
                  onClick={() => auth.customer && setPaymentMethod("card")}
                  disabled={!auth.customer}
                >
                  <span className="ck-radio" />
                  <span>{tr("Карта", "Корт")}{!auth.customer && <em> — {tr("войдите в аккаунт", "ворид шавед")}</em>}</span>
                </button>
              </div>
              <p className="ck-note">{t.checkoutRequiredNote}</p>

              <button className="ck-btn" onClick={handlePlaceOrder} disabled={placing}>
                {placing ? t.checkoutPlacing : tr("Подтвердить заказ", "Тасдиқи фармоиш")}
              </button>
              <span className="ck-link ck-back" onClick={() => setCheckoutStep("cart")}>← {t.checkoutBackToCart}</span>
            </div>
            {summary}
          </div>
        )}

        {checkoutStep === "payment" && (
          <div className="ck-center">
            <div className="ck-eyebrow">{tr(`Заказ № ${orderNumber}`, `Фармоиш № ${orderNumber}`)}</div>
            <p className="ck-lead">{t.checkoutOrderCreated.replace("{id}", String(orderNumber))}</p>
            {paymentMethod === "qr" ? (
              <>
                <div className="ck-qr">{t.checkoutQrMock}</div>
                <p className="ck-note ck-note--center">{t.checkoutScanQr.replace("{amount}", String(orderTotal))}</p>
              </>
            ) : (
              <div className="ck-card">
                <label className="ck-field"><span className="ck-field-label">{tr("Номер карты", "Рақами корт")}</span><input disabled /></label>
                <div className="ck-card-row">
                  <label className="ck-field"><span className="ck-field-label">ММ/ГГ</span><input disabled /></label>
                  <label className="ck-field"><span className="ck-field-label">CVV</span><input disabled /></label>
                </div>
                <p className="ck-note">{tr(`Оплата картой ${orderTotal} смн (макет — интеграция с эквайрингом появится позже).`, `Пардохт бо корт ${orderTotal} смн (макет).`)}</p>
              </div>
            )}
            <button className="ck-btn" onClick={() => setCheckoutStep("done")}>{t.checkoutPaidMock}</button>
          </div>
        )}

        {checkoutStep === "done" && (
          <div className="ck-center">
            <div className="ck-eyebrow">{tr(`Заказ № ${orderNumber}`, `Фармоиш № ${orderNumber}`)}</div>
            <p className="ck-lead">{t.checkoutThankYou}</p>
            <p className="ck-note ck-note--center">{t.checkoutOrderAccepted.replace("{id}", String(orderNumber)).replace("{phone}", customerPhone)}</p>
            <div className="ck-done-actions">
              <button className="ck-btn" onClick={() => router.push("/")}>{tr("Продолжить покупки", "Идомаи харид")}</button>
              {auth.customer && <span className="ck-link" onClick={() => router.push("/orders")}>{tr("Мои заказы", "Фармоишҳои ман")}</span>}
            </div>
          </div>
        )}
      </div>

      {toastMessage && <div className="ck-toast">{toastMessage}</div>}
    </div>
  );
}
