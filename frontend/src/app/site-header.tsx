"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "./theme-context";
import { useLang } from "./lang-context";
import { useAuth } from "./auth-context";
import { useCart } from "./cart-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function SiteHeader() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const auth = useAuth();
  const cart = useCart();
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
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
  }, [auth.token]);

  return (
    <nav
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        borderBottom: "1px solid var(--line)",
        background: "var(--bg)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          gap: 10,
        }}
      >
        <div
          onClick={() => router.push("/")}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            cursor: "pointer",
            width: 28,
            flexShrink: 0,
          }}
        >
          <span style={{ height: 2, background: "var(--text)" }} />
          <span style={{ height: 2, background: "var(--text)" }} />
          <span style={{ height: 2, background: "var(--text)" }} />
        </div>

        <img
          src={theme === "dark" ? "/logo.png" : "/logo-light.png"}
          alt="Oina.tj"
          onClick={() => router.push("/")}
          style={{ height: "clamp(28px, 8vw, 48px)", flexShrink: 1, minWidth: 0, cursor: "pointer" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <span
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
          </span>

          <span
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
              flexShrink: 0,
            }}
            title="Переключить тему"
          >
            <span style={{ fontSize: 10 }}>{theme === "dark" ? "☀" : "☾"}</span>
          </span>

          <span
            className="header-profile-icon"
            onClick={() => router.push("/favorites")}
            style={{ cursor: "pointer", position: "relative", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            title={lang === "ru" ? "Избранное" : "Интихобҳо"}
          >
            <svg width="21" height="21" viewBox="0 0 24 24">
              <path
                d="M12 21 C12 21 3 14.5 3 8.6 C3 5.5 5.4 3.3 8.2 3.3 C10 3.3 11.3 4.2 12 5.4 C12.7 4.2 14 3.3 15.8 3.3 C18.6 3.3 21 5.5 21 8.6 C21 14.5 12 21 12 21 Z"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1"
              />
            </svg>
            {favoritesCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
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
                {favoritesCount}
              </div>
            )}
          </span>

          <div
            onClick={() => router.push("/?cart=1")}
            style={{ cursor: "pointer", position: "relative", width: 26, height: 26, flexShrink: 0 }}
          >
            <svg width="26" height="26" viewBox="0 0 30 30">
              <path
                d="M8 13 C8 13 8 11 10 11 L20 11 C22 11 22 13 22 13 L21 25 C21 25.5 20.5 26 20 26 L10 26 C9.5 26 9 25.5 9 25 Z"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1"
              />
              <path
                d="M10 11 C10 8 12.2 6 15 6 C17.8 6 20 8 20 11"
                fill="none"
                stroke="var(--text)"
                strokeWidth="1"
              />
              <line x1="12" y1="16" x2="12" y2="21" stroke="var(--text)" strokeWidth="0.6" />
              <line x1="15" y1="16" x2="15" y2="21" stroke="var(--text)" strokeWidth="0.6" />
              <line x1="18" y1="16" x2="18" y2="21" stroke="var(--text)" strokeWidth="0.6" />
            </svg>
            {cart.totalCount > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
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
                {cart.totalCount}
              </div>
            )}
          </div>

          <span
            className="header-profile-icon"
            onClick={() => router.push("/account")}
            style={{ cursor: "pointer", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            title={auth.customer ? auth.customer.name || "Профиль" : lang === "ru" ? "Войти" : "Даромадан"}
          >
            {auth.customer?.avatar_url ? (
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundImage: `url(${auth.customer.avatar_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  border: "1px solid var(--line)",
                }}
              />
            ) : (
              <svg width="21" height="21" viewBox="0 0 20 20">
                <circle cx="10" cy="7" r="3.2" fill="none" stroke="var(--text-muted)" strokeWidth="1" />
                <path d="M4 17 C4 13 6.5 11 10 11 C13.5 11 16 13 16 17" fill="none" stroke="var(--text-muted)" strokeWidth="1" />
              </svg>
            )}
          </span>
        </div>
      </div>
    </nav>
  );
}
