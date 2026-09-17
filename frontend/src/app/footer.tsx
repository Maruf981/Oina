"use client";
import { SocialLinks } from "./social-links";

import { useRouter } from "next/navigation";
import { translations, Lang } from "./translations";
import { useLang } from "./lang-context";
import { useTheme } from "./theme-context";
import { useAuth } from "./auth-context";

export function Footer({ lang }: { lang: Lang }) {
  const t = translations[lang];
  const router = useRouter();
  const { toggleLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);

  const label: React.CSSProperties = {
    fontFamily: "var(--font-label)", fontSize: 10, fontWeight: 500,
    letterSpacing: "var(--tracking-label)", textTransform: "uppercase",
    color: "var(--text-muted)", marginBottom: 18,
  };
  const link: React.CSSProperties = { cursor: "pointer", fontSize: 13, color: "var(--text)" };
  const toggle: React.CSSProperties = {
    cursor: "pointer", fontFamily: "var(--font-label)", fontSize: 11, fontWeight: 500,
    letterSpacing: "var(--tracking-label)", textTransform: "uppercase", color: "var(--text)",
  };

  return (
    <footer style={{ background: "var(--bg)", color: "var(--text)", borderTop: "1px solid var(--line)", marginTop: 80, width: "100vw", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
      <div className="footer-grid" style={{ padding: "64px 3.5rem 48px", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: 40 }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 400, marginBottom: 14 }}>Oina</div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 300 }}>{t.footerAbout}</p>
        </div>

        <div>
          <div style={label}>{t.footerLinks}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span onClick={() => router.push("/faq")} style={link}>{t.footerFaq}</span>
            <span onClick={() => router.push("/delivery")} style={link}>{t.footerDelivery}</span>
            <span onClick={() => router.push("/terms")} style={link}>{t.footerTerms}</span>
            <span onClick={() => router.push("/privacy")} style={link}>{t.footerPrivacy}</span>
          </div>
        </div>

        <div>
          <div style={label}>{tr("Аккаунт", "Ҳисоб")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span onClick={() => router.push(auth.customer ? "/account" : "/?login=1")} style={link}>
              {auth.customer ? tr("Профиль", "Уток") : tr("Войти", "Даромадан")}
            </span>
            <span onClick={() => router.push("/favorites")} style={link}>{tr("Избранное", "Интихобҳо")}</span>
            <span onClick={() => router.push("/orders")} style={link}>{tr("Мои заказы", "Фармоишҳои ман")}</span>
          </div>
        </div>

        <div>
          <div style={label}>{tr("Мы в соцсетях", "Мо дар шабакаҳо")}</div>
          <SocialLinks />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", padding: "18px 3.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 28 }}>
          <span onClick={toggleLang} style={toggle}>
            <span style={{ opacity: lang === "ru" ? 1 : 0.4 }}>RU</span> / <span style={{ opacity: lang === "tj" ? 1 : 0.4 }}>TJ</span>
          </span>
          <span onClick={toggleTheme} style={toggle}>
            {theme === "dark" ? tr("Светлая тема", "Мавзӯи равшан") : tr("Тёмная тема", "Мавзӯи торик")}
          </span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>© {new Date().getFullYear()} Oina.tj — {t.footerRights}</span>
      </div>
    </footer>
  );
}
