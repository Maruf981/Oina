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
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {t.footerContactSoon}
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
