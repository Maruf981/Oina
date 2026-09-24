"use client";
import { useEffect, useState } from "react";
import { useLang } from "./lang-context";
import "./back-to-top.css";

export function BackToTop() {
  const { lang } = useLang();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setShow(window.scrollY > window.innerHeight * 2));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <button
      type="button"
      aria-label={lang === "tj" ? "Ба боло" : "Наверх"}
      className={`to-top${show ? " is-visible" : ""}`}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
