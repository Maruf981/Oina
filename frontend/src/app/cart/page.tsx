"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const auth = useAuth();
  const cart = useCart();
  const router = useRouter();
  const { lang } = useLang();
  const t = translations[lang];

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<Record<number, string>>({});

  useEffect(() => {
    const ids = Array.from(new Set(cart.items.map((i) => i.productId)));
    if (ids.length === 0) {
      setProductImages({});
      return;
    }
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
      setToastMessage(friendlyMsg);
      setTimeout(() => setToastMessage(null), 3000);
    } finally {
      setPlacing(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: 12,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    fontSize: 14,
    boxSizing: "border-box",
  };

  return (
    <>
      <SiteHeader />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 40, paddingTop: 140 }}>
        <div className="product-title" style={{ fontSize: 24, marginBottom: 24 }}>{t.cart}</div>

        {checkoutStep === "cart" && (
          <>
            {cart.items.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>{t.noProducts}</p>
                <button
                  onClick={() => router.push("/")}
                  style={{ padding: "12px 24px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                >
                  {lang === "ru" ? "В каталог" : "Ба каталог"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div style={{ flex: 2, minWidth: 320 }}>
                  {cart.items.map((item) => (
                    <div
                      key={item.variantId}
                      style={{ display: "flex", gap: 14, borderBottom: "1px solid var(--line)", paddingBottom: 16, marginBottom: 16 }}
                    >
                      {productImages[item.productId] && (
                        <img
                          src={productImages[item.productId]}
                          alt={item.title}
                          style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="product-title" style={{ fontSize: 15, marginBottom: 6 }}>{item.title}</div>
                        <div className="catalog-label" style={{ marginBottom: 10 }}>{item.size} / {item.color}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span onClick={() => cart.updateQty(item.variantId, item.qty - 1)} style={{ cursor: "pointer", fontFamily: "var(--font-label)" }}>−</span>
                            <span style={{ fontFamily: "var(--font-label)" }}>{item.qty}</span>
                            <span onClick={() => cart.updateQty(item.variantId, item.qty + 1)} style={{ cursor: "pointer", fontFamily: "var(--font-label)" }}>+</span>
                          </div>
                          <span className="price">{item.price * item.qty} смн</span>
                          <span onClick={() => cart.removeItem(item.variantId)} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 14 }}>✕</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ border: "1px solid var(--line)", padding: 20, position: "sticky", top: 140 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                      <span className="product-title" style={{ fontSize: 16 }}>{t.cartTotal}</span>
                      <span className="price" style={{ fontSize: 16 }}>{cart.totalPrice} смн</span>
                    </div>
                    <button
                      onClick={() => setCheckoutStep("form")}
                      style={{ width: "100%", padding: "14px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
                    >
                      {t.checkoutConfirmOrder}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {checkoutStep === "form" && (
          <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: -6 }}>{t.checkoutRequiredNote}</div>
            <div>
              <input placeholder={`${t.checkoutName} *`} value={customerName} onChange={(e) => setCustomerName(e.target.value)} style={{ ...inputStyle, border: attemptedSubmit && !customerName ? "1px solid #E24B4A" : inputStyle.border }} />
              {attemptedSubmit && !customerName && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>}
            </div>
            <div>
              <input placeholder="Телефон (+992ХХХХХХХХХ или 900ХХХХХХ) *" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} style={{ ...inputStyle, border: (customerPhone && !isValidPhone(customerPhone)) || (attemptedSubmit && !customerPhone) ? "1px solid #E24B4A" : inputStyle.border }} />
              {customerPhone && !isValidPhone(customerPhone) && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{lang === "ru" ? "Формат: +992ХХХХХХХХХ или 900ХХХХХХ" : "Формат: +992ХХХХХХХХХ ё 900ХХХХХХ"}</div>}
              {attemptedSubmit && !customerPhone && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>}
            </div>
            <div>
              <input placeholder={`${t.checkoutAddress} *`} value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} style={{ ...inputStyle, border: attemptedSubmit && !deliveryAddress ? "1px solid #E24B4A" : inputStyle.border }} />
              {attemptedSubmit && !deliveryAddress && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>}
            </div>
            <div>
              <input placeholder={`${t.checkoutLandmark} *`} value={landmark} onChange={(e) => setLandmark(e.target.value)} style={{ ...inputStyle, border: attemptedSubmit && !landmark ? "1px solid #E24B4A" : inputStyle.border }} />
              {attemptedSubmit && !landmark && <div style={{ fontSize: 12, color: "#E24B4A", marginTop: 4 }}>{t.checkoutFillField}</div>}
            </div>
            <textarea placeholder={t.checkoutCommentPlaceholder} value={orderComment} onChange={(e) => setOrderComment(e.target.value)} rows={3} style={{ padding: 12, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", fontSize: 14, resize: "none" }} />

            <div>
              <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 10 }}>{t.checkoutPaymentMethod}</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div onClick={() => setPaymentMethod("qr")} style={{ flex: 1, padding: 12, textAlign: "center", border: paymentMethod === "qr" ? "1px solid var(--accent)" : "1px solid var(--line)", color: paymentMethod === "qr" ? "var(--accent)" : "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>QR-код</div>
                <div onClick={() => auth.customer && setPaymentMethod("card")} style={{ flex: 1, padding: 12, textAlign: "center", border: paymentMethod === "card" ? "1px solid var(--accent)" : "1px solid var(--line)", color: !auth.customer ? "var(--line)" : paymentMethod === "card" ? "var(--accent)" : "var(--text-muted)", cursor: auth.customer ? "pointer" : "not-allowed", fontSize: 13 }}>
                  {t.checkoutCardLoginRequired.split(" ")[0]} {!auth.customer && `(${lang === "ru" ? "войдите" : "даромадан"})`}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={handlePlaceOrder} disabled={placing} style={{ width: "100%", padding: "14px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", opacity: placing ? 0.6 : 1 }}>
                {placing ? t.checkoutPlacing : t.checkoutConfirmOrder}
              </button>
              <span onClick={() => setCheckoutStep("cart")} style={{ textAlign: "center", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>{t.checkoutBackToCart}</span>
            </div>
          </div>
        )}

        {checkoutStep === "payment" && (
          <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, margin: "0 auto" }}>
            <span className="product-title" style={{ fontSize: 18 }}>{t.checkoutOrderCreated.replace("{id}", String(orderNumber))}</span>
            {paymentMethod === "qr" ? (
              <>
                <div style={{ width: 180, height: 180, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  {t.checkoutQrMock}
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 260 }}>{t.checkoutScanQr.replace("{amount}", String(cart.totalPrice))}</p>
              </>
            ) : (
              <>
                <div style={{ width: "100%", padding: 20, background: "var(--surface)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
                  <input placeholder="Номер карты" disabled style={{ width: "100%", padding: 10, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text-muted)", fontSize: 13, boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 10, width: "100%" }}>
                    <input placeholder="ММ/ГГ" disabled style={{ flex: 1, minWidth: 0, padding: 10, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text-muted)", fontSize: 13, boxSizing: "border-box" }} />
                    <input placeholder="CVV" disabled style={{ flex: 1, minWidth: 0, padding: 10, background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text-muted)", fontSize: 13, boxSizing: "border-box" }} />
                  </div>
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, maxWidth: 260 }}>Оплата картой {cart.totalPrice} смн (макет — интеграция с эквайрингом появится позже).</p>
              </>
            )}
            <button
              onClick={() => setCheckoutStep("done")}
              style={{ width: "100%", padding: "14px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 13, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
            >
              {t.checkoutPaidMock}
            </button>
          </div>
        )}

        {checkoutStep === "done" && (
          <div style={{ maxWidth: 480, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 16, margin: "0 auto" }}>
            <span className="product-title" style={{ fontSize: 20 }}>{t.checkoutThankYou}</span>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{t.checkoutOrderAccepted.replace("{id}", String(orderNumber)).replace("{phone}", customerPhone)}</p>
            <button
              onClick={() => {
                setCheckoutStep("cart");
                setCustomerName("");
                setCustomerPhone("");
                setDeliveryAddress("");
                setLandmark("");
                setOrderComment("");
                setOrderNumber(null);
                router.push("/");
              }}
              style={{ padding: "12px 24px", background: "transparent", color: "var(--text)", border: "1px solid var(--line)", fontFamily: "var(--font-label)", fontSize: 13, cursor: "pointer" }}
            >
              {t.checkoutClose}
            </button>
          </div>
        )}
      </div>

      {toastMessage && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#E24B4A", color: "#fff", padding: "12px 20px", fontSize: 13, zIndex: 300 }}>
          {toastMessage}
        </div>
      )}
    </>
  );
}
