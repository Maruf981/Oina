"use client";

import { cld } from "../lib/cld";
import { useEffect, useRef, useState } from "react";

export type DualSlide = {
  id: number;
  left_image_url: string | null;
  center_image_url?: string | null;
  right_image_url: string | null;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  text_color: string;
  category_id: number | null;
  left_label_ru?: string | null;
  left_label_tj?: string | null;
  center_label_ru?: string | null;
  center_label_tj?: string | null;
  right_label_ru?: string | null;
  right_label_tj?: string | null;
};

type Side = "left" | "center" | "right";
const SIDES: Side[] = ["left", "center", "right"];
const BALL = 112;
const DESKTOP_H = "min(460px, calc(100svh - 150px))";

const imgOf = (s: DualSlide, side: Side) =>
  side === "left" ? s.left_image_url : side === "center" ? s.center_image_url ?? null : s.right_image_url;

const STACK_OFFSET = 14; // на сколько px виден край предыдущей карточки

// Один слайд на компьютере: 3 фото в ряд + шарик с подписью под курсором
function DesktopRow({ s, lang, fallback, onOpen }: { s: DualSlide; lang: string; fallback: string; onOpen: () => void }) {
  const [hover, setHover] = useState(false);
  const [ball, setBall] = useState<{ side: Side; x: number; y: number }>({ side: "left", x: 0, y: 0 });
  const layerRefs = {
    left: useRef<HTMLDivElement>(null),
    center: useRef<HTMLDivElement>(null),
    right: useRef<HTMLDivElement>(null),
  };
  const ballRefs = {
    left: useRef<HTMLDivElement>(null),
    center: useRef<HTMLDivElement>(null),
    right: useRef<HTMLDivElement>(null),
  };
  const prevSide = useRef<Side | null>(null);

  // Удар о вертикальную линию и толчок назад
  const push = (side: Side, strength = 1, from?: Side | null) => {
    const el = ballRefs[side].current;
    if (!el) return;
    const dir = side === "left" ? 1 : side === "right" ? -1 : from === "right" ? 1 : -1;
    const toLine = 14 * dir * strength;
    el.animate(
      [
        { transform: `translateX(${toLine}px) scale(0.82, 1.1)` },
        { transform: `translateX(${-toLine * 0.5}px) scale(1.06, 0.95)`, offset: 0.55 },
        { transform: "translateX(0) scale(1)" },
      ],
      { duration: 480, easing: "cubic-bezier(0.34,1.56,0.64,1)" }
    );
  };

  useEffect(() => {
    if (!hover) { prevSide.current = null; return; }
    if (prevSide.current && prevSide.current !== ball.side) push(ball.side, 1, prevSide.current);
    prevSide.current = ball.side;
  }, [ball.side, hover]);

  const pick = (ru?: string | null, tj?: string | null) => (lang === "ru" ? ru || tj : tj || ru) || null;
  const labels: Record<Side, string> = {
    left: pick(s.left_label_ru, s.left_label_tj) || s.button_text || fallback,
    center: pick(s.center_label_ru, s.center_label_tj) || fallback,
    right: pick(s.right_label_ru, s.right_label_tj) || s.title || fallback,
  };

  const ballLayer = (side: Side) => {
    const on = hover && ball.side === side;
    return (
      <div ref={layerRefs[side]} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            left: ball.side === side ? ball.x : side === "left" ? "100%" : side === "right" ? 0 : "50%",
            top: ball.y,
            width: BALL,
            height: BALL,
            transform: `translate(-50%, -50%) scale(${on ? 1 : 0})`,
            transition: "transform 0.25s ease-out",
          }}
        >
          <div
            ref={ballRefs[side]}
            style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: "rgba(23,23,23,0.3)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.4)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
              padding: 10, boxSizing: "border-box", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase",
            }}
          >
            {labels[side]}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onOpen}
      onMouseMove={(e) => {
        const L = layerRefs.left.current, C = layerRefs.center.current, R = layerRefs.right.current;
        if (!L || !C || !R) return;
        const rl = L.getBoundingClientRect();
        const rc = C.getBoundingClientRect();
        const side: Side = e.clientX < rl.right ? "left" : e.clientX < rc.right ? "center" : "right";
        const r = side === "left" ? rl : side === "center" ? rc : R.getBoundingClientRect();
        setBall({ side, x: e.clientX - r.left, y: e.clientY - r.top });
        if (!hover) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
      style={{ position: "absolute", inset: 0, cursor: "none" }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex" }}>
        {SIDES.map((side, k) => {
          const url = imgOf(s, side);
          return (
            <div key={side} style={{ display: "contents" }}>
              {k > 0 && <div style={{ flexShrink: 0, width: 1, background: "rgba(255,255,255,0.18)" }} />}
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    width: "100%", height: "100%",
                    backgroundColor: side === "left" ? undefined : "var(--header-bg)",
                    backgroundImage: url ? `url(${cld(url, 1400)})` : "none",
                    backgroundSize: "cover", backgroundPosition: "center",
                    transform: hover && ball.side === side ? "scale(1.04)" : "scale(1)",
                    transition: "transform 0.9s ease-out",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 4 }}>
        {ballLayer("left")}
        <div style={{ width: 1, flexShrink: 0 }} />
        {ballLayer("center")}
        <div style={{ width: 1, flexShrink: 0 }} />
        {ballLayer("right")}
      </div>
    </div>
  );
}

// Стопка: карточка прилипает под шапкой, следующая наезжает сверху, предыдущая уменьшается и темнеет
export function DualSlider({ slides, router, lang }: { slides: DualSlide[]; router: any; lang: string }) {
  const items = slides.filter((s) => s.left_image_url || s.center_image_url || s.right_image_url);
  const fallback = lang === "ru" ? "Смотреть" : "Дидан";
  const [isMobile, setIsMobile] = useState(false);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const innerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dimRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  // на телефоне каждое фото — отдельная квадратная карточка
  const cards = isMobile
    ? items.flatMap((s) => SIDES.filter((side) => imgOf(s, side)).map((side) => ({ key: `${s.id}-${side}`, s, side: side as Side | null })))
    : items.map((s) => ({ key: String(s.id), s, side: null as Side | null }));
  const count = cards.length;

  useEffect(() => {
    if (count <= 1) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const update = () => {
      raf = 0;
      for (let i = 0; i < count - 1; i++) {
        const cur = cardRefs.current[i];
        const next = cardRefs.current[i + 1];
        const inner = innerRefs.current[i];
        const dim = dimRefs.current[i];
        if (!cur || !next || !inner || !dim) continue;
        const h = cur.offsetHeight || 1;
        const p = Math.min(1, Math.max(0, 1 - (next.getBoundingClientRect().top - cur.getBoundingClientRect().top) / h));
        if (!reduce) inner.style.transform = `scale(${1 - 0.05 * p})`;
        dim.style.opacity = String(0.45 * p);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, isMobile]);

  if (count === 0) return null;

  const open = (s: DualSlide) => { if (s.category_id) router.push(`/?category_id=${s.category_id}`); };

  return (
    <div style={{ position: "relative", width: "100%", margin: "20px 0" }}>
      {cards.map((c, i) => (
        <div
          key={c.key}
          ref={(el) => { cardRefs.current[i] = el; }}
          style={{
            position: "sticky",
            top: `calc(var(--header-h, 84px) + ${16 + Math.min(i, 4) * STACK_OFFSET}px)`,
            zIndex: i + 1,
            width: "100%",
            ...(isMobile ? { aspectRatio: "1 / 1" } : { height: DESKTOP_H }),
            marginBottom: i < count - 1 ? 28 : 0,
          }}
        >
          <div
            ref={(el) => { innerRefs.current[i] = el; }}
            style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--surface)", transformOrigin: "50% 0", willChange: "transform" }}
          >
            {c.side ? (
              <div
                onClick={() => open(c.s)}
                style={{
                  position: "absolute", inset: 0,
                  backgroundColor: "var(--header-bg)",
                  backgroundImage: `url(${cld(imgOf(c.s, c.side), 1400)})`,
                  backgroundSize: "cover", backgroundPosition: "center",
                }}
              />
            ) : (
              <DesktopRow s={c.s} lang={lang} fallback={fallback} onOpen={() => open(c.s)} />
            )}
            <div
              ref={(el) => { dimRefs.current[i] = el; }}
              style={{ position: "absolute", inset: 0, background: "#000", opacity: 0, pointerEvents: "none", zIndex: 6 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
