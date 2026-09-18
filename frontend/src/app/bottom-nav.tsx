"use client";

import { cld } from "../lib/cld";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const tabsByLang = {
  ru: [
    { key: "home", label: "Главная", path: "/", icon: "home" },
    { key: "favorites", label: "Избранное", path: "/favorites", icon: "heart" },
    { key: "cart", label: "Корзина", path: "/cart", icon: "cart" },
    { key: "account", label: "Профиль", path: "/account", icon: "user" },
  ],
  tj: [
    { key: "home", label: "Асосӣ", path: "/", icon: "home" },
    { key: "favorites", label: "Интихобҳо", path: "/favorites", icon: "heart" },
    { key: "cart", label: "Сабад", path: "/cart", icon: "cart" },
    { key: "account", label: "Уток", path: "/account", icon: "user" },
  ],
};

function Icon({ name, active }: { name: string; active: boolean }) {
  const color = active ? "#ffffff" : "rgba(255, 255, 255, 0.7)";
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
  if (name === "cart") {
    return (
      <svg width="21" height="21" viewBox="0 0 30 30" fill="none" stroke={color} strokeWidth="1.6">
        <path d="M8 13 C8 13 8 11 10 11 L20 11 C22 11 22 13 22 13 L21 25 C21 25.5 20.5 26 20 26 L10 26 C9.5 26 9 25.5 9 25 Z" strokeLinejoin="round" />
        <path d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11" />
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
        background: "#EFE9E0",
        border: "none",
        color: "#221e1a",
        fontWeight: 500,
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
  const cart = useCart();
  const [lang, setLang] = useState<"ru" | "tj">("ru");
  const [favoritesCount, setFavoritesCount] = useState(0);
  useEffect(() => {
    const saved = localStorage.getItem("lang") as "ru" | "tj" | null;
    if (saved) setLang(saved);
  }, []);

  useEffect(() => {
    const load = () => {
    if (!auth.token) {
      const saved = localStorage.getItem("guest_favorites");
      if (saved) {
        try {
          const ids = JSON.parse(saved);
          setFavoritesCount(Array.isArray(ids) ? ids.length : 0);
        } catch {
          setFavoritesCount(0);
        }
      } else {
        setFavoritesCount(0);
      }
      return;
    }
    fetch(`${API_URL}/favorites/`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((res) => res.json())
      .then((data) => setFavoritesCount(Array.isArray(data) ? data.length : 0))
      .catch(() => setFavoritesCount(0));
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener("oina:favorites-changed", load);
    return () => { window.removeEventListener("focus", load); window.removeEventListener("oina:favorites-changed", load); };
  }, [auth.token, pathname]);

  if (pathname.startsWith("/admin")) return null;

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
          background: "var(--header-bg)",
          borderTop: "1px solid var(--header-border)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)", paddingBottom: "max(22px, env(safe-area-inset-bottom))",
        }}
      >
        {tabs.map((tab) => {
          const active = tab.path === "/" ? pathname === "/" : pathname.startsWith(tab.path);
          const count = tab.key === "favorites" ? favoritesCount : tab.key === "cart" ? cart.totalCount : 0;
          return (
            <div
              key={tab.key}
              onClick={() => {
                if (tab.key === "account" && !auth.customer) {
                  router.push("/?login=1");
                  return;
                }
                if (tab.key === "cart") {
                  window.dispatchEvent(new CustomEvent("oina:open-bag", { detail: "cart" }));
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
                      backgroundImage: `url(${cld(auth.customer.avatar_url, 96)})`,
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
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                  color: active ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
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
