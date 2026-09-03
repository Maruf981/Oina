"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";

type OrderItem = {
  id: number;
  product_variant_id: number;
  quantity: number;
  price_at_order: number;
};

type Order = {
  id: number;
  status: string;
  payment_method: string | null;
  delivery_address: string | null;
  comment: string | null;
  total: number;
  created_at: string;
  items: OrderItem[];
};

const statusLabels: Record<string, string> = {
  new: "Новый",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  confirmed: "Подтверждён",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function OrdersPage() {
  const auth = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const { theme } = useTheme();
  const { lang } = useLang();

  useEffect(() => {
    if (!auth.token) {
      setOrders([]);
      return;
    }
    fetch(`${API_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [auth.token]);

  return (
    <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <SiteHeader />
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 40, paddingTop: 106 }}>
        <span
          onClick={() => router.push("/")}
          style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)" }}
        >
          {lang === "ru" ? "← Назад в каталог" : "← Ба қафо"}
        </span>

        <h1 className="product-title" style={{ fontSize: 28, margin: "24px 0 30px" }}>
          {lang === "ru" ? "Мои заказы" : "Фармоишҳо"}
        </h1>

        {orders.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>
            {lang === "ru" ? "У вас пока нет заказов" : "Айни ҳол фармоиш мавҷуд нест"}
          </p>
        )}

        {orders.map((order) => (
          <div key={order.id} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span className="product-title" style={{ fontSize: 16 }}>Заказ №{order.id}</span>
              <span className="price">{order.total} смн</span>
            </div>
            <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 10 }}>
              {statusLabels[order.status] || order.status} · {new Date(order.created_at).toLocaleDateString("ru-RU")}
            </div>
            {order.delivery_address && (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{order.delivery_address}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
