"use client";

import { useRouter } from "next/navigation";

export function BackButton({ href }: { href?: string }) {
  const router = useRouter();
  return (
    <span
      onClick={() => (href ? router.push(href) : router.back())}
      role="button"
      aria-label="Назад"
      style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        border: "1px solid var(--line)",
        background: "var(--surface)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M11 18l-6-6 6-6" />
      </svg>
    </span>
  );
}
