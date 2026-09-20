"use client";

import { cld } from "../lib/cld";
import "./cart/cart.css";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";
import { useLang } from "./lang-context";
import { translations } from "./translations";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Step = "cart" | "form" | "payment" | "done";

function isValidPhone(phone: string): boolean {
  return /^(\+992\d{9}|\d{9})$/.test(phone.trim());
}

/* Корзина и всё оформление заказа — в выезжающей панели справа.
   Открывается событием: window.dispatchEvent(new CustomEvent("oina:open-bag", { detail: "cart" | "form" })) */
export function BagDrawerHost() {
  const auth = useAuth();
  const cart = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const { lang } = useLang();
  const t = translations[lang];
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const bodyRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("cart");
  const [images, setImages] = useState<Record<number, string>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [orderComment, setOrderComment] = useState("");
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "card" | "cod">("qr");
  const [isDushanbe, setIsDushanbe] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [orderTotal, setOrderTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; percent: number; discount: number; total: number; sig: string } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoChecking, setPromoChecking] = useState(false);
  const cartSig = cart.items.map((i) => `${i.variantId}x${i.qty}`).join(",");
  const activePromo = promo && promo.sig === cartSig && auth.customer ? promo : null;

  // открытие по событию
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setStep((cur) => (cur === "payment" || cur === "done" ? cur : detail === "form" ? "form" : "cart"));
      setOpen(true);
    };
    window.addEventListener("oina:open-bag", onOpen);
    return () => window.removeEventListener("oina:open-bag", onOpen);
  }, []);

  // /?bag=1 (редирект со старой страницы /cart) открывает панель
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("bag") === "1") {
        params.delete("bag");
        const qs = params.toString();
        window.history.replaceState(null, "", qs ? `${pathname}?${qs}` : pathname);
        setStep("cart");
        setOpen(true);
        return;
      }
    } catch {}
    setOpen((o) => (step === "payment" ? o : false));
  }, [pathname]);

  // блокировка прокрутки и Escape
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // автозаполнение из профиля
  useEffect(() => {
    if (!auth.customer) return;
    if (!customerName && auth.customer.name) setCustomerName(auth.customer.name);
    if (!customerPhone && auth.customer.phone) setCustomerPhone(auth.customer.phone);
    if (!deliveryAddress && auth.customer.address) setDeliveryAddress(auth.customer.address);
  }, [auth.customer]);

  // фото товаров
  useEffect(() => {
    if (!open) return;
    const ids = Array.from(new Set(cart.items.map((i) => i.productId)));
    if (ids.length === 0) return;
    fetch(`${API_URL}/products/?ids=${ids.join(",")}`)
      .then((res) => res.json())
      .then((data: { id: number; images?: { url: string; media_type?: string }[] }[]) => {
        const map: Record<number, string> = {};
        data.forEach((p) => {
          const thumb = p.images?.find((img) => img.media_type !== "video");
          if (thumb) map[p.id] = thumb.url;
        });
        setImages((prev) => ({ ...prev, ...map }));
      })
      .catch(() => {});
  }, [open, cart.items]);

  const resetOrder = () => {
    setStep("cart");
    setOrderNumber(null);
    setOrderTotal(0);
    setOrderComment("");
    setLandmark("");
    setAttemptedSubmit(false);
    setError(null);
  };

  function close() {
    if (step === "payment") return; // заказ уже создан — сначала подтвердить оплату
    setOpen(false);
    if (step === "done") resetOrder();
  }

  const go = (href: string) => {
    if (step === "payment") return;
    setOpen(false);
    if (step === "done") resetOrder();
    router.push(href);
  };

  const applyPromo = async () => {
    const code = promoInput.trim().toUpperCase();
    if (!code || !auth.token) return;
    setPromoChecking(true);
    setPromoError(null);
    try {
      const res = await fetch(`${API_URL}/promo-codes/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ code, items: cart.items.map((item) => ({ product_variant_id: item.variantId, quantity: item.qty })) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPromo(null);
        setPromoError(typeof data?.detail === "string" ? data.detail : tr("Промокод не найден", "Промокод ёфт нашуд"));
        return;
      }
      setPromo({ ...data, sig: cartSig });
    } catch {
      setPromoError(tr("Не удалось проверить промокод", "Санҷиши промокод нашуд"));
    } finally {
      setPromoChecking(false);
    }
  };

  const handlePlaceOrder = async () => {
    setAttemptedSubmit(true);
    setError(null);
    if (!customerName || !customerPhone || !deliveryAddress || !landmark || !isValidPhone(customerPhone)) return;
    setPlacing(true);
    try {
      const res = await fetch(`${API_URL}/orders/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}) },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_address: `${deliveryAddress}, Ориентир: ${landmark}`,
          comment: orderComment,
          payment_method: paymentMethod,
          is_dushanbe: isDushanbe,
          items: cart.items.map((item) => ({ product_variant_id: item.variantId, quantity: item.qty })),
          promo_code: activePromo ? activePromo.code : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Order failed");
      }
      const order = await res.json();
      setOrderTotal(Number(order.total));
      await cart.clearCart();
      setPromo(null);
      setPromoInput("");
      setOrderNumber(order.id);
      setStep(paymentMethod === "cod" ? "done" : "payment");
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "";
      setError(msg.includes("В наличии только") || msg.includes("снят с продажи") || msg.includes("Слишком много заказов") || msg.includes("неоплаченн") || msg.includes("Оплата при получении") || msg.includes("после входа") || msg.toLowerCase().includes("промокод") ? msg : tr("Ошибка оформления заказа. Попробуйте ещё раз.", "Хатогӣ ҳангоми фармоиш. Бори дигар кӯшиш кунед."));
    } finally {
      setPlacing(false);
    }
  };

  if (!open) return null;

  const steps: { key: Step; label: string }[] = [
    { key: "cart", label: tr("Корзина", "Сабад") },
    { key: "form", label: tr("Доставка", "Расонидан") },
    { key: "payment", label: tr("Оплата", "Пардохт") },
    { key: "done", label: tr("Готово", "Тайёр") },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);
  const title = step === "cart" ? tr("Ваша корзина", "Сабади шумо") : step === "form" ? tr("Оформление", "Фармоиш") : step === "payment" ? tr("Оплата", "Пардохт") : tr("Заказ принят", "Фармоиш қабул шуд");

  const field = (label: string, value: string, onChange: (v: string) => void, err: string | null, placeholder?: string) => (
    <label className={`ck-field${err ? " has-error" : ""}`}>
      <span className="ck-field-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {err && <span className="ck-error">{err}</span>}
    </label>
  );

  return (
    <div className="oh-drawer-backdrop bd-backdrop" onClick={close}>
      <div className="oh-drawer oh-drawer--right bag" onClick={(e) => e.stopPropagation()}>
        <div className="bag-head">
          <span className="oh-label">
            {title}{step === "cart" && <span className="bag-count"> ({cart.totalCount})</span>}
          </span>
          {step !== "payment" && <span className="oh-action" onClick={close}>{tr("Закрыть", "Пӯшидан")}</span>}
        </div>

        {cart.items.length > 0 || step !== "cart" ? (
          <ol className="bd-steps">
            {steps.map((s, i) => (
              <li key={s.key} className={i === stepIndex ? "is-active" : i < stepIndex ? "is-done" : ""}>
                {String(i + 1).padStart(2, "0")} {s.label}
              </li>
            ))}
          </ol>
        ) : null}

        <div className="bag-list bd-body" ref={bodyRef}>
          {step === "cart" && (
            cart.items.length === 0 ? (
              <div className="bag-empty">
                <p>{tr("В корзине пока пусто", "Сабад холӣ аст")}</p>
                <span className="bag-link" onClick={() => go("/")}>{tr("Перейти в каталог", "Ба каталог")}</span>
              </div>
            ) : (
              cart.items.map((item) => (
                <div key={item.variantId} className="bag-item">
                  <div className="bag-img" onClick={() => go(`/product/${item.productId}`)}>
                    {images[item.productId] && <img src={cld(images[item.productId], 300)} alt={item.title} />}
                  </div>
                  <div className="bag-info">
                    <div className="bag-row">
                      <div>
                        <div className="bag-meta">{item.size} · {item.color}</div>
                        <div className="bag-title" onClick={() => go(`/product/${item.productId}`)}>{item.title}</div>
                      </div>
                      <div className="bag-price">{item.price * item.qty} смн</div>
                    </div>
                    <div className="bag-row bag-row--controls">
                      <div className="bag-qty">
                        <button onClick={() => cart.updateQty(item.variantId, item.qty - 1)}>−</button>
                        <span>{item.qty}</span>
                        <button onClick={() => cart.updateQty(item.variantId, item.qty + 1)}>+</button>
                      </div>
                      <span className="bag-remove" onClick={() => cart.removeItem(item.variantId)}>{tr("Удалить", "Нест кардан")}</span>
                    </div>
                  </div>
                </div>
              ))
            )
          )}

          {step === "form" && (
            <div className="bd-form">
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
              {field(`${tr("Улица, дом, квартира", "Кӯча, хона, ҳуҷра")} *`, deliveryAddress, setDeliveryAddress, attemptedSubmit && !deliveryAddress ? t.checkoutFillField : null)}
              {field(`${t.checkoutLandmark} *`, landmark, setLandmark, attemptedSubmit && !landmark ? t.checkoutFillField : null)}
              <label className="ck-field">
                <span className="ck-field-label">{tr("Комментарий", "Шарҳ")}</span>
                <textarea value={orderComment} onChange={(e) => setOrderComment(e.target.value)} placeholder={t.checkoutCommentPlaceholder} rows={2} />
              </label>

              <div className="ck-label ck-label--gap">{tr("Город доставки", "Шаҳри расонидан")}</div>
              <div className="ck-pay">
                <button className={`ck-pay-opt${isDushanbe ? " is-active" : ""}`} onClick={() => setIsDushanbe(true)}>
                  <span className="ck-radio" /><span>Душанбе</span>
                </button>
                <button className={`ck-pay-opt${!isDushanbe ? " is-active" : ""}`} onClick={() => { setIsDushanbe(false); if (paymentMethod === "cod") setPaymentMethod("qr"); }}>
                  <span className="ck-radio" /><span>{tr("Другой город — полная предоплата, доставка бесплатно", "Шаҳри дигар — пардохти пурраи пешакӣ, расонидан ройгон")}</span>
                </button>
              </div>

              <div className="ck-label ck-label--gap">{t.checkoutPaymentMethod}</div>
              <div className="ck-pay">
                <button className={`ck-pay-opt${paymentMethod === "cod" ? " is-active" : ""}`} onClick={() => auth.customer && isDushanbe && setPaymentMethod("cod")} disabled={!auth.customer || !isDushanbe}>
                  <span className="ck-radio" /><span>{tr("При получении", "Ҳангоми қабул")}{!auth.customer ? <em> — {tr("войдите в аккаунт", "ворид шавед")}</em> : !isDushanbe ? <em> — {tr("только по Душанбе", "танҳо дар Душанбе")}</em> : null}</span>
                </button>
                <button className={`ck-pay-opt${paymentMethod === "qr" ? " is-active" : ""}`} onClick={() => setPaymentMethod("qr")}>
                  <span className="ck-radio" /><span>QR-код</span>
                </button>
                <button className={`ck-pay-opt${paymentMethod === "card" ? " is-active" : ""}`} onClick={() => auth.customer && setPaymentMethod("card")} disabled={!auth.customer}>
                  <span className="ck-radio" /><span>{tr("Карта", "Корт")}{!auth.customer && <em> — {tr("войдите в аккаунт", "ворид шавед")}</em>}</span>
                </button>
              </div>

              <div className="ck-label ck-label--gap">{tr("Ваш заказ", "Фармоиши шумо")} ({cart.totalCount})</div>
              {cart.items.map((item) => (
                <div key={item.variantId} className="ck-sum-item">
                  <div className="ck-sum-img">{images[item.productId] && <img src={cld(images[item.productId], 300)} alt={item.title} />}</div>
                  <div className="ck-sum-info">
                    <div className="ck-meta">{item.size} · {item.color} · ×{item.qty}</div>
                    <div className="ck-sum-title">{item.title}</div>
                  </div>
                  <div className="ck-sum-price">{item.price * item.qty} смн</div>
                </div>
              ))}
              <div className="ck-label ck-label--gap">{tr("Промокод", "Промокод")}</div>
              {!auth.customer ? (
                <p className="ck-note">{tr("Войдите в аккаунт, чтобы применить промокод", "Барои истифодаи промокод ба аккаунт ворид шавед")}</p>
              ) : activePromo ? (
                <div className="ck-promo">
                  <div className="ck-promo-msg">
                    {activePromo.discount > 0
                      ? `${activePromo.code}: −${activePromo.percent}% · −${activePromo.discount} смн`
                      : tr(`${activePromo.code}: скидка на товары уже больше промокода`, `${activePromo.code}: тахфифи мол аллакай зиёдтар аст`)}
                  </div>
                  <button type="button" className="ck-promo-btn" onClick={() => { setPromo(null); setPromoInput(""); }}>{tr("Убрать", "Бекор кардан")}</button>
                </div>
              ) : (
                <>
                  <div className="ck-promo">
                    <label className="ck-field">
                      <input
                        value={promoInput}
                        maxLength={32}
                        placeholder={tr("Введите промокод", "Промокодро ворид кунед")}
                        onChange={(e) => { setPromoInput(e.target.value); setPromoError(null); }}
                        onKeyDown={(e) => { if (e.key === "Enter") applyPromo(); }}
                      />
                    </label>
                    <button type="button" className="ck-promo-btn" onClick={applyPromo} disabled={promoChecking || !promoInput.trim()}>
                      {promoChecking ? "…" : tr("Применить", "Татбиқ")}
                    </button>
                  </div>
                  {promoError && <div className="ck-promo-msg is-error">{promoError}</div>}
                </>
              )}
              <p className="ck-note">{t.checkoutRequiredNote}</p>
            </div>
          )}

          {step === "payment" && (
            <div className="bd-center">
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
            </div>
          )}

          {step === "done" && (
            <div className="bd-center">
              <div className="ck-eyebrow">{tr(`Заказ № ${orderNumber}`, `Фармоиш № ${orderNumber}`)}</div>
              <p className="ck-lead">{t.checkoutThankYou}</p>
              <p className="ck-note ck-note--center">{t.checkoutOrderAccepted.replace("{id}", String(orderNumber)).replace("{phone}", customerPhone)}</p>
            </div>
          )}
        </div>

        {step === "cart" && cart.items.length > 0 && (
          <div className="bag-foot">
            <div className="bag-total">
              <div>
                <div className="bag-total-title">{tr("Итого", "Ҳамагӣ")}</div>
                <div className="bag-total-note">{tr("Доставка за 24 часа", "Расонидан дар 24 соат")}</div>
              </div>
              <div className="bag-total-sum">{cart.totalPrice} смн</div>
            </div>
            <button className="bag-checkout" onClick={() => setStep("form")}>{tr("Оформить заказ", "Фармоиш додан")}</button>
            <div className="bag-links">
              <span className="bag-link" onClick={close}>{tr("Продолжить покупки", "Идомаи харид")}</span>
              <span className="bag-link bag-link--muted" onClick={() => cart.clearCart()}>{tr("Очистить корзину", "Холӣ кардан")}</span>
            </div>
          </div>
        )}

        {step === "form" && (
          <div className="bag-foot">
            <div className="bag-total">
              <div className="bag-total-title">{tr("Итого", "Ҳамагӣ")}</div>
              <div className="bag-total-sum">
                {activePromo && activePromo.discount > 0 && <span className="bag-total-old">{cart.totalPrice} смн</span>}
                {activePromo ? activePromo.total : cart.totalPrice} смн
              </div>
            </div>
            {error && <div className="bd-error">{error}</div>}
            <button className="bag-checkout" onClick={handlePlaceOrder} disabled={placing || cart.items.length === 0}>
              {placing ? t.checkoutPlacing : tr("Подтвердить заказ", "Тасдиқи фармоиш")}
            </button>
            <div className="bag-links bag-links--center">
              <span className="bag-link" onClick={() => setStep("cart")}>← {tr("Назад в корзину", "Бозгашт ба сабад")}</span>
            </div>
          </div>
        )}

        {step === "payment" && (
          <div className="bag-foot">
            <button className="bag-checkout" onClick={() => setStep("done")}>{t.checkoutPaidMock}</button>
          </div>
        )}

        {step === "done" && (
          <div className="bag-foot">
            <button className="bag-checkout" onClick={() => go("/")}>{tr("Продолжить покупки", "Идомаи харид")}</button>
            {auth.customer && (
              <div className="bag-links bag-links--center">
                <span className="bag-link" onClick={() => go("/orders")}>{tr("Мои заказы", "Фармоишҳои ман")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
