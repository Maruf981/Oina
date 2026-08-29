"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";

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

export default function AccountPage() {
  const auth = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    if (!auth.token) {
      router.push("/");
      return;
    }
    fetch(`${API_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [auth.token]);

  if (!auth.customer) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", padding: 40 }}>
        <span
          onClick={() => router.push("/")}
          style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)" }}
        >
          ← Назад в каталог
        </span>

        <h1 className="product-title" style={{ fontSize: 32, margin: "24px 0 8px" }}>
          {auth.customer.name || "Профиль"}
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>{auth.customer.phone}</p>

        <span
          onClick={() => {
            auth.logout();
            router.push("/");
          }}
          style={{
            cursor: "pointer",
            fontFamily: "var(--font-label)",
            fontSize: 12,
            letterSpacing: "0.04em",
            color: "var(--text-muted)",
            border: "1px solid var(--line)",
            padding: "8px 16px",
            display: "inline-block",
            marginBottom: 40,
          }}
        >
          Выйти
        </span>

        <h2 className="product-title" style={{ fontSize: 20, marginBottom: 20, borderTop: "1px solid var(--line)", paddingTop: 30 }}>
          Мои заказы
        </h2>

        {orders.length === 0 && <p style={{ color: "var(--text-muted)" }}>У вас пока нет заказов</p>}

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