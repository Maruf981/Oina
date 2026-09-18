"use client";
import { useEffect } from "react";

// Что проявляем на главной: заголовки секций (кроме линии) и текст под карточками.
const SELECTOR = [
  ".sec-head > :not(.coll-rule)",
  ".coll-head > :not(.coll-rule)",
  ".pc-grid .pc-info",
  ".rec-item .pc-info",
].join(",");

const DURATION = 800;
const STEP = 90;

export function useBlurReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;

    const seen = new WeakSet<Element>();
    const timers: number[] = [];

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
        visible.sort((a, b) => {
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return Math.round(ra.top - rb.top) || ra.left - rb.left;
        });
        visible.forEach((el, i) => {
          io.unobserve(el);
          const delay = Math.min(i, 8) * STEP;
          el.style.transitionDelay = `${delay}ms`;
          el.classList.add("blr-in");
          timers.push(window.setTimeout(() => {
            el.classList.remove("blr", "blr-in");
            el.style.transitionDelay = "";
          }, DURATION + delay + 100));
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );

    const scan = () => {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const r = el.getBoundingClientRect();
        const onScreen = r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
        if (onScreen) return; // уже видно — не прячем, чтобы не мигало
        el.classList.add("blr");
        io.observe(el);
      });
    };

    let raf = 0;
    const mo = new MutationObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(scan);
    });
    scan();
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      document.querySelectorAll(".blr").forEach((el) => el.classList.remove("blr", "blr-in"));
    };
  }, []);
}
