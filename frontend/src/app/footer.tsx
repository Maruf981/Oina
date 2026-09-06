"use client";

import { useRouter } from "next/navigation";
import { translations, Lang } from "./translations";

export function Footer({ lang }: { lang: Lang }) {
  const t = translations[lang];
  const router = useRouter();

  return (
    <footer style={{ borderTop: "1px solid var(--line)", marginTop: 60 }}>
      <div
        className="footer-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 20px",
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr",
          gap: 40,
        }}
      >
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 12 }}>
            Oina.tj
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>
            {t.footerAbout}
          </p>
        </div>

        <div>
          <div
            className="catalog-label"
            style={{ border: "none", padding: 0, marginBottom: 14 }}
          >
            {t.footerLinks}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span onClick={() => router.push("/faq")} style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
              {t.footerFaq}
            </span>
            <span onClick={() => router.push("/delivery")} style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
              {t.footerDelivery}
            </span>
            <span onClick={() => router.push("/terms")} style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
              {t.footerTerms}
            </span>
            <span onClick={() => router.push("/privacy")} style={{ cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>
              {t.footerPrivacy}
            </span>
          </div>
        </div>

        <div>
          <div
            className="catalog-label"
            style={{ border: "none", padding: 0, marginBottom: 14 }}
          >
            {t.footerContact}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="https://t.me/oina_channel_tj"
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#26A5E4", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Telegram"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                <path d="M22 4.01L2.3 11.5c-1.3.5-1.3 1.2-.24 1.53l4.98 1.55L18.2 7.05c.5-.32.96-.14.58.2l-8.5 7.67h-.02l.02.01-.32 4.9c.47 0 .68-.22.93-.47l2.24-2.15 4.66 3.42c.86.47 1.48.23 1.7-.8L22.9 5.4c.32-1.25-.47-1.82-1.13-1.4z"/>
              </svg>
            </a>
            <a
              href="https://www.instagram.com/oina._tj"
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Instagram"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.42.46.66.26 1.22.6 1.77 1.15.55.55.89 1.11 1.15 1.77.24.63.41 1.36.46 2.42.05 1.06.06 1.4.06 4.12s-.01 3.06-.06 4.12c-.05 1.06-.22 1.79-.46 2.42-.26.66-.6 1.22-1.15 1.77-.55.55-1.11.89-1.77 1.15-.63.24-1.36.41-2.42.46-1.06.05-1.4.06-4.12.06s-3.06-.01-4.12-.06c-1.06-.05-1.79-.22-2.42-.46-.66-.26-1.22-.6-1.77-1.15-.55-.55-.89-1.11-1.15-1.77-.24-.63-.41-1.36-.46-2.42C2.01 15.06 2 14.72 2 12s.01-3.06.06-4.12c.05-1.06.22-1.79.46-2.42.26-.66.6-1.22 1.15-1.77.55-.55 1.11-.89 1.77-1.15.63-.24 1.36-.41 2.42-.46C8.94 2.01 9.28 2 12 2zm0 1.8c-2.67 0-2.99.01-4.04.06-.97.04-1.5.2-1.85.34-.47.18-.8.4-1.15.75-.35.35-.57.68-.75 1.15-.14.35-.3.88-.34 1.85-.05 1.05-.06 1.37-.06 4.04s.01 2.99.06 4.04c.04.97.2 1.5.34 1.85.18.47.4.8.75 1.15.35.35.68.57 1.15.75.35.14.88.3 1.85.34 1.05.05 1.37.06 4.04.06s2.99-.01 4.04-.06c.97-.04 1.5-.2 1.85-.34.47-.18.8-.4 1.15-.75.35-.35.57-.68.75-1.15.14-.35.3-.88.34-1.85.05-1.05.06-1.37.06-4.04s-.01-2.99-.06-4.04c-.04-.97-.2-1.5-.34-1.85-.18-.47-.4-.8-.75-1.15-.35-.35-.68-.57-1.15-.75-.35-.14-.88-.3-1.85-.34C14.99 3.81 14.67 3.8 12 3.8zm0 3.05a5.15 5.15 0 110 10.3 5.15 5.15 0 010-10.3zm0 1.8a3.35 3.35 0 100 6.7 3.35 3.35 0 000-6.7zm5.35-1.99a1.2 1.2 0 11-2.4 0 1.2 1.2 0 012.4 0z"/>
              </svg>
            </a>
            <a
              href="https://www.tiktok.com/@oina.tj"
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="TikTok"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff">
                <path d="M16.6 5.82c-.86-.94-1.34-2.16-1.34-3.42h-3.06v13.9a3.1 3.1 0 01-3.1 3 3.1 3.1 0 01-3.1-3.1 3.1 3.1 0 013.1-3.1c.29 0 .57.04.84.11V9.98a6.2 6.2 0 00-.84-.06A6.17 6.17 0 003 16.1a6.17 6.17 0 006.1 6.17 6.17 6.17 0 006.1-6.17V9.68a8.36 8.36 0 004.8 1.53V8.15c-1.1 0-2.13-.35-2.98-.95a5.4 5.4 0 01-1.42-1.38z"/>
              </svg>
            </a>
            <a
              href="mailto:oina.tj.official@gmail.com"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--surface)", border: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "center" }}
              title="Email"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 6l10 7 10-7"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--line)",
          padding: "16px 20px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        © {new Date().getFullYear()} Oina.tj — {t.footerRights}
      </div>
    </footer>
  );
}
