"use client";
import { SocialLinks } from "./social-links";

import { useRouter } from "next/navigation";
import { translations, Lang } from "./translations";

export function Footer({ lang }: { lang: Lang }) {
  const t = translations[lang];
  const router = useRouter();

  return (
    <footer style={{ background: "var(--header-bg)", color: "var(--header-text)", borderTop: "1px solid var(--header-border)", marginTop: 60, width: "100vw", position: "relative", left: "50%", transform: "translateX(-50%)" }}>
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
          <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: 13, lineHeight: 1.6, maxWidth: 280 }}>
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
            <span onClick={() => router.push("/faq")} style={{ cursor: "pointer", fontSize: 13, color: "rgba(255, 255, 255, 0.85)" }}>
              {t.footerFaq}
            </span>
            <span onClick={() => router.push("/delivery")} style={{ cursor: "pointer", fontSize: 13, color: "rgba(255, 255, 255, 0.85)" }}>
              {t.footerDelivery}
            </span>
            <span onClick={() => router.push("/terms")} style={{ cursor: "pointer", fontSize: 13, color: "rgba(255, 255, 255, 0.85)" }}>
              {t.footerTerms}
            </span>
            <span onClick={() => router.push("/privacy")} style={{ cursor: "pointer", fontSize: 13, color: "rgba(255, 255, 255, 0.85)" }}>
              {t.footerPrivacy}
            </span>
          </div>
        </div>

        <div>
          <div
            className="catalog-label"
            style={{ border: "none", padding: 0, marginBottom: 14 }}
          >
          </div>
          <SocialLinks />
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--header-border)",
          padding: "16px 20px",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255, 255, 255, 0.85)",
        }}
      >
        © {new Date().getFullYear()} Oina.tj — {t.footerRights}
      </div>
    </footer>
  );
}
