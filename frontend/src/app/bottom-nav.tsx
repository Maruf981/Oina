"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const tabsByLang = {
  ru: [
    { key: "home", label: "Главная", path: "/", icon: "home" },
    { key: "favorites", label: "Избранное", path: "/favorites", icon: "heart" },
    { key: "orders", label: "Заказы", path: "/orders", icon: "package" },
    { key: "account", label: "Профиль", path: "/account", icon: "user" },
  ],
  tj: [
    { key: "home", label: "Асосӣ", path: "/", icon: "home" },
    { key: "favorites", label: "Интихобҳо", path: "/favorites", icon: "heart" },
    { key: "orders", label: "Фармоишҳо", path: "/orders", icon: "package" },
    { key: "account", label: "Уток", path: "/account", icon: "user" },
  ],
};

function Icon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "var(--accent)" : "var(--text-muted)";
  if (name === "home") {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4">
        <path d="M3 11 L12 4 L21 11" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10 V20 H19 V10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24">
        <path
          d="M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3.3 8.2 3.3 C10 3.3 11.3 4.2 12 5.4 C12.7 4.2 14 3.3 15.8 3.3 C18.6 3.3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z"
          fill={active ? color : "none"}
          stroke={color}
          strokeWidth="1.4"
        />
      </svg>
    );
  }
  if (name === "package") {
    return (
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4">
        <path d="M3 8 L12 3 L21 8 L21 16 L12 21 L3 16 Z" strokeLinejoin="round" />
        <path d="M3 8 L12 13 L21 8" strokeLinejoin="round" />
        <path d="M12 13 V21" />
      </svg>
    );
  }
  return (
    <svg width="21" height="21" viewBox="0 0 20 20">
      <circle cx="10" cy="7" r="3.2" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M4 17 C4 13 6.5 11 10 11 C13.5 11 16 13 16 17" fill="none" stroke={color} strokeWidth="1.4" />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: -3,
        right: -8,
        width: 15,
        height: 15,
        borderRadius: "50%",
        background: "var(--bg)",
        border: "1px solid var(--accent)",
        color: "var(--accent)",
        fontSize: 9,
        fontFamily: "var(--font-label)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {count}
    </div>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  const [lang, setLang] = useState<"ru" | "tj">("ru");
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("lang") as "ru" | "tj" | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    if (!auth.token) {
      setFavoritesCount(0);
      setOrdersCount(0);
      return;
    }
    fetch(`${API_URL}/favorites/`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((res) => res.json())
      .then((data) => setFavoritesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setFavoritesCount(0));

    fetch(`${API_URL}/orders/my`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((res) => res.json())
      .then((data) => setOrdersCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setOrdersCount(0));
  }, [auth.token, pathname]);

  const tabs = tabsByLang[lang];

  return (
    <nav className="bottom-nav-mobile" style={{ display: "none" }}>
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 120,
          background: "var(--bg)",
          borderTop: "1px solid var(--line)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
          const count = tab.key === "favorites" ? favoritesCount : tab.key === "orders" ? ordersCount : 0;
          return (
            <div
              key={tab.key}
              onClick={() => {
                if (tab.key === "account" && !auth.customer) {
                  router.push("/?login=1");
                  return;
                }
                router.push(tab.path);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "10px 0 8px",
                cursor: "pointer",
              }}
            >
              <div style={{ position: "relative" }}>
                {tab.key === "account" && auth.customer?.avatar_url ? (
                  <div
                    style={{
                      width: 21,
                      height: 21,
                      borderRadius: "50%",
                      backgroundImage: `url(${auth.customer.avatar_url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: active ? "1.5px solid var(--accent)" : "1px solid var(--line)",
                    }}
                  />
                ) : (
                  <Icon name={tab.icon} active={active} />
                )}
                <Badge count={count} />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-label)",
                  fontSize: 10,
                  letterSpacing: "0.02em",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                }}
              >
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
