"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

type Tab = "profile" | "orders" | "password";

export default function AccountPage() {
  const auth = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>("profile");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);


  useEffect(() => {
    if (!auth.token) {
      router.push("/");
      return;
    }
  }, [auth.token]);

  useEffect(() => {
    if (auth.customer) {
      setName(auth.customer.name || "");
      setPhone(auth.customer.phone || "");
      setAddress(auth.customer.address || "");
    }
  }, [auth.customer]);

  useEffect(() => {
    if (!auth.token) return;
    fetch(`${API_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [auth.token]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.token) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      if (res.ok) await auth.refreshMe();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.token) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ name, phone, address }),
      });
      if (res.ok) {
        await auth.refreshMe();
        setProfileMsg("Сохранено");
      } else {
        const data = await res.json().catch(() => null);
        setProfileMsg(data?.detail || "Ошибка сохранения");
      }
    } catch {
      setProfileMsg("Ошибка сети");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!auth.token) return;
    setSavingPassword(true);
    setPasswordMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      if (res.ok) {
        setPasswordMsg("Пароль изменён");
        setOldPassword("");
        setNewPassword("");
      } else {
        const data = await res.json().catch(() => null);
        setPasswordMsg(data?.detail || "Ошибка смены пароля");
      }
    } catch {
      setPasswordMsg("Ошибка сети");
    } finally {
      setSavingPassword(false);
    }
  };

  if (!auth.customer) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    padding: 12,
    background: "var(--surface)",
    border: "1px solid var(--line)",
    color: "var(--text)",
    fontSize: 14,
    width: "100%",
  };

  const tabs: { key: Tab; label: string; icon: string }[] = lang === "ru" ? [
    { key: "profile", label: "Данные", icon: "user" },
    { key: "orders", label: "Заказы", icon: "package" },
    { key: "password", label: "Пароль", icon: "lock" },
  ] : [
    { key: "profile", label: "Маълумот", icon: "user" },
    { key: "orders", label: "Таърих", icon: "package" },
    { key: "password", label: "Парол", icon: "lock" },
  ];

  const renderTabIcon = (icon: string, active: boolean) => {
    const color = active ? "var(--accent)" : "var(--text-muted)";
    if (icon === "user") {
      return (
        <svg width="18" height="18" viewBox="0 0 20 20">
          <circle cx="10" cy="7" r="3.2" fill="none" stroke={color} strokeWidth="1.3" />
          <path d="M4 17 C4 13 6.5 11 10 11 C13.5 11 16 13 16 17" fill="none" stroke={color} strokeWidth="1.3" />
        </svg>
      );
    }
    if (icon === "package") {
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3">
          <path d="M3 8 L12 3 L21 8 L21 16 L12 21 L3 16 Z" strokeLinejoin="round" />
          <path d="M3 8 L12 13 L21 8" strokeLinejoin="round" />
          <path d="M12 13 V21" />
        </svg>
      );
    }
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.3">
        <rect x="5" y="11" width="14" height="9" rx="1.5" />
        <path d="M8 11 V7 C8 4.8 9.8 3 12 3 C14.2 3 16 4.8 16 7 V11" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}>
      <SiteHeader />
      <div style={{ maxWidth: 500, margin: "0 auto", padding: 40, paddingTop: 106 }}>
        <span
          onClick={() => router.push("/")}
          style={{ cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)" }}
        >
          {lang === "ru" ? "← Назад в каталог" : "← Ба қафо"}
        </span>

        <h1 className="product-title" style={{ fontSize: 28, margin: "24px 0 30px" }}>
          {lang === "ru" ? "Профиль" : "Уток"}
        </h1>

        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
          <label style={{ cursor: "pointer", position: "relative", display: "inline-block" }}>
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: "50%",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                backgroundImage: auth.customer.avatar_url ? `url(${auth.customer.avatar_url})` : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-label)",
                fontSize: 11,
                color: "var(--text-muted)",
                textAlign: "center",
                opacity: uploadingAvatar ? 0.5 : 1,
              }}
            >
              {!auth.customer.avatar_url && !uploadingAvatar && "Фото"}
              {uploadingAvatar && "..."}
            </div>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "var(--accent)",
                border: "2px solid var(--bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bg)" strokeWidth="2">
                <path d="M12 20h9" strokeLinecap="round" />
                <path d="M16.5 3.5 L20.5 7.5 L8 20 H4 V16 Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: "none" }} />
          </label>
          <div>
            <div className="product-title" style={{ fontSize: 18 }}>{auth.customer.name || "Без имени"}</div>
            <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{auth.customer.phone}</div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--line)",
            marginBottom: 28,
          }}
        >
          {tabs.map((tItem) => {
            const active = tab === tItem.key;
            return (
              <div
                key={tItem.key}
                onClick={() => setTab(tItem.key)}
                style={{
                  flex: 1,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 0 12px",
                  borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                }}
              >
                {renderTabIcon(tItem.icon, active)}
                <span
                  style={{
                    fontFamily: "var(--font-label)",
                    fontSize: 11,
                    letterSpacing: "0.02em",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {tItem.label}
                </span>
              </div>
            );
          })}
        </div>

        {tab === "profile" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input placeholder="Телефон" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            <input placeholder={lang === "ru" ? "Адрес доставки" : "Суроғаи расонидани мол"} value={address} onChange={(e) => setAddress(e.target.value)} style={inputStyle} />
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              style={{
                padding: "12px",
                background: "var(--text)",
                color: "var(--bg)",
                border: "none",
                fontFamily: "var(--font-label)",
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: savingProfile ? 0.6 : 1,
              }}
            >
              {savingProfile ? (lang === "ru" ? "Сохраняем..." : "Сабт мешавад...") : (lang === "ru" ? "Сохранить" : "Сабт")}
            </button>
            {profileMsg && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{profileMsg}</span>}
          </div>
        )}

        {tab === "orders" && (
          <div>
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
        )}

        {tab === "password" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              type="password"
              placeholder={lang === "ru" ? "Текущий пароль" : "Пароли ҳозира"}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder={lang === "ru" ? "Новый пароль" : "Пароли нав"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <button
              onClick={handleChangePassword}
              disabled={savingPassword || !oldPassword || !newPassword}
              style={{
                padding: "12px",
                background: "transparent",
                color: "var(--text)",
                border: "1px solid var(--line)",
                fontFamily: "var(--font-label)",
                fontSize: 13,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
                opacity: savingPassword ? 0.6 : 1,
              }}
            >
              {savingPassword ? (lang === "ru" ? "Сохраняем..." : "Нигоҳ дошта истодааст...") : (lang === "ru" ? "Изменить пароль" : "Ивази парол")}
            </button>
            {passwordMsg && <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{passwordMsg}</span>}
          </div>
        )}

        <div style={{ marginTop: 40, borderTop: "1px solid var(--line)", paddingTop: 24 }}>
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
              padding: "10px 18px",
              display: "inline-block",
            }}
          >
            {lang === "ru" ? "Выйти" : "Баромад"}
          </span>
        </div>
      </div>
    </div>
  );
}
