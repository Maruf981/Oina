"use client";
import { useEffect, useRef, type ReactNode } from "react";
import "./bestsellers-row.css";

type Props<T extends { id: number | string }> = {
  items: T[];
  lang: string;
  onAll: () => void;
  renderItem: (p: T) => ReactNode;
};

export function BestsellersRow<T extends { id: number | string }>({ items, lang, onAll, renderItem }: Props<T>) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    // плавный скролл колесом (Ctrl+колесо = zoom, не трогаем)
    let target = el.scrollLeft;
    let raf = 0;
    const animate = () => {
      const diff = target - el.scrollLeft;
      if (Math.abs(diff) < 0.5) { el.scrollLeft = target; raf = 0; return; }
      el.scrollLeft += diff * 0.1;
      raf = requestAnimationFrame(animate);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (!raf) target = el.scrollLeft;
      if ((e.deltaY < 0 && target <= 0) || (e.deltaY > 0 && target >= max - 1)) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY;
      target = Math.max(0, Math.min(max, target + delta));
      if (!raf) raf = requestAnimationFrame(animate);
    };

    // перетаскивание мышкой
    let down = false, moved = false, startX = 0, startLeft = 0;
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      cancelAnimationFrame(raf); raf = 0;
      down = true; moved = false; startX = e.clientX; startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 5) { moved = true; el.classList.add("is-drag"); }
      if (moved) el.scrollLeft = startLeft - dx;
    };
    const onUp = () => { down = false; target = el.scrollLeft; setTimeout(() => el.classList.remove("is-drag"), 0); };
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  const ru = lang === "ru";
  return (
    <section className="bs" style={{ gridColumn: "1 / -1" }}>
      <div className="bs-bg" aria-hidden="true" />
      <div className="bs-head">
        <h2 className="sec-title bs-title">{ru ? "Хиты продаж" : "Хитҳои фурӯш"}</h2>
        <p className="bs-sub">{ru ? "Самые популярные вещи сезона" : "Маъмултарин либосҳои мавсим"}</p>
        <button type="button" className="bs-all" onClick={onAll}>{ru ? "Смотреть все" : "Дидани ҳама"}</button>
      </div>
      <div className="bs-track" ref={trackRef} data-lenis-prevent>
        {items.map((p) => (
          <div className="bs-item" key={p.id}>{renderItem(p)}</div>
        ))}
      </div>
    </section>
  );
}
