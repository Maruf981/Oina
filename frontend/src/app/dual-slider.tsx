"use client";

import { useEffect, useRef, useState } from "react";

export type DualSlide = {
  id: number;
  left_image_url: string | null;
  right_image_url: string | null;
  title: string;
  subtitle: string | null;
  button_text: string | null;
  text_color: string;
  category_id: number | null;
};

type Side = "left" | "right";
const BALL = 112;

export function DualSlider({ slides, router, lang }: { slides: DualSlide[]; router: any; lang: string }) {
  const items = slides.filter((s) => s.left_image_url || s.right_image_url);
  const count = items.length;
  const fallback = lang === "ru" ? "Смотреть" : "Дидан";

  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [hover, setHover] = useState(false);
  const [ball, setBall] = useState<{ side: Side; x: number; y: number }>({ side: "left", x: 0, y: 0 });

  const rootRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftBallRef = useRef<HTMLDivElement>(null);
  const rightBallRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const lockRef = useRef(false);
  const wheelAcc = useRef(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const prevSide = useRef<Side | null>(null);
  indexRef.current = index;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener("change", upd);
    return () => mq.removeEventListener("change", upd);
  }, []);

  useEffect(() => {
    if (indexRef.current > count - 1) setIndex(0);
  }, [count]);

  // Удар о вертикальную линию и толчок назад
  const push = (side: Side, strength = 1) => {
    const el = side === "left" ? leftBallRef.current : rightBallRef.current;
    if (!el) return;
    const toLine = (side === "left" ? 14 : -14) * strength;
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
    if (prevSide.current && prevSide.current !== ball.side) push(ball.side);
    prevSide.current = ball.side;
  }, [ball.side, hover]);

  useEffect(() => {
    if (hover) push(ball.side, 0.6);
  }, [index]);

  const goTo = (next: number) => {
    if (lockRef.current || count <= 1 || next === indexRef.current) return;
    lockRef.current = true;
    wheelAcc.current = 0;
    setIndex(next);
    setTimeout(() => { lockRef.current = false; wheelAcc.current = 0; }, 900);
  };
  const step = (dir: number) => goTo((indexRef.current + dir + count) % count);

  // Колесо: страница над блоком не скроллится, слайды листаются по кругу
  useEffect(() => {
    const el = rootRef.current;
    if (!el || count <= 1) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (lockRef.current) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (!d) return;
      if (Math.sign(wheelAcc.current) !== Math.sign(d)) wheelAcc.current = 0;
      wheelAcc.current += d;
      if (Math.abs(wheelAcc.current) >= 40) step(d > 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [count, isMobile]);

  if (count === 0) return null;

  const current = items[Math.min(index, count - 1)];
  const labels: Record<Side, string> = {
    left: current.button_text || fallback,
    right: current.title || fallback,
  };

  const ballLayer = (side: Side) => {
    const on = hover && ball.side === side;
    return (
      <div
        ref={side === "left" ? leftRef : rightRef}
        style={{ flex: 1, position: "relative", overflow: "hidden" }}
      >
        <div
          style={{
            position: "absolute",
            left: ball.side === side ? ball.x : side === "left" ? "100%" : 0,
            top: ball.y,
            width: BALL,
            height: BALL,
            transform: `translate(-50%, -50%) scale(${on ? 1 : 0})`,
            transition: "transform 0.25s ease-out",
          }}
        >
          <div
            ref={side === "left" ? leftBallRef : rightBallRef}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "rgba(23,23,23,0.3)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.4)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: 10,
              boxSizing: "border-box",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
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
      ref={rootRef}
      onMouseMove={(e) => {
        if (isMobile || !leftRef.current || !rightRef.current) return;
        const rl = leftRef.current.getBoundingClientRect();
        const side: Side = e.clientX < rl.right ? "left" : "right";
        const r = side === "left" ? rl : rightRef.current.getBoundingClientRect();
        setBall({ side, x: e.clientX - r.left, y: e.clientY - r.top });
        if (!hover) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
      onTouchStart={(e) => { const t = e.touches[0]; touchRef.current = { x: t.clientX, y: t.clientY }; }}
      onTouchEnd={(e) => {
        const s = touchRef.current;
        touchRef.current = null;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) step(dx < 0 ? 1 : -1);
      }}
      style={{
        position: "relative",
        width: "100%",
        height: isMobile ? 640 : 520,
        overflow: "hidden",
        background: "var(--surface)",
        cursor: isMobile ? "auto" : "none",
        touchAction: "pan-y",
        margin: "20px 0",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: isMobile ? "row" : "column",
          transform: isMobile ? `translateX(-${index * 100}%)` : `translateY(-${index * 100}%)`,
          transition: "transform 0.85s cubic-bezier(0.77,0,0.175,1)",
        }}
      >
        {items.map((s, i) => (
          <div
            key={s.id}
            onClick={() => { if (s.category_id) router.push(`/?category=${s.category_id}`); }}
            style={{ flex: "0 0 100%", width: "100%", height: "100%", display: "flex", flexDirection: isMobile ? "column" : "row" }}
          >
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundImage: s.left_image_url ? `url(${s.left_image_url})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: i === index && hover && ball.side === "left" ? "scale(1.04)" : "scale(1)",
                  transition: "transform 0.9s ease-out",
                }}
              />
            </div>
            <div style={{ flexShrink: 0, background: "rgba(255,255,255,0.18)", ...(isMobile ? { height: 1 } : { width: 1 }) }} />
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "var(--header-bg)",
                  backgroundImage: s.right_image_url ? `url(${s.right_image_url})` : "none",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: i === index && hover && ball.side === "right" ? "scale(1.04)" : "scale(1)",
                  transition: "transform 0.9s ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {!isMobile && (
        <div style={{ position: "absolute", inset: 0, display: "flex", pointerEvents: "none", zIndex: 4 }}>
          {ballLayer("left")}
          <div style={{ width: 1, flexShrink: 0 }} />
          {ballLayer("right")}
        </div>
      )}

      {count > 1 && (
        <div style={{ position: "absolute", bottom: 16, right: isMobile ? 20 : 40, display: "flex", gap: 8, zIndex: 5 }}>
          {items.map((_, i) => (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i); }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: i === index ? "#fff" : "rgba(255,255,255,0.4)", boxShadow: "0 0 3px rgba(0,0,0,0.4)", cursor: "pointer" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
