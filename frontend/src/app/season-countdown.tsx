"use client";
import { useEffect, useState } from "react";

// Отсчёт до конца текущего сезона (по Душанбе, UTC+5). Сезон переключается сам.
// Осень: сен–ноя, зима: дек–фев, весна: мар–май, лето: июн–авг.
const TZ_MS = 5 * 3600 * 1000;
const SEASONS = [
  { ru: "Зима", tj: "Зимистон", endMonth: 3 },   // 0 — зима, кончается 1 марта
  { ru: "Весна", tj: "Баҳор", endMonth: 6 },     // 1 — весна, до 1 июня
  { ru: "Лето", tj: "Тобистон", endMonth: 9 },   // 2 — лето, до 1 сентября
  { ru: "Осень", tj: "Тирамоҳ", endMonth: 12 },  // 3 — осень, до 1 декабря
];

function seasonState(nowMs: number) {
  const d = new Date(nowMs + TZ_MS); // «часы» Душанбе в UTC-полях
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const idx = m === 12 || m <= 2 ? 0 : m <= 5 ? 1 : m <= 8 ? 2 : 3;
  const endYear = idx === 0 && m === 12 ? y + 1 : y;
  const endMs = Date.UTC(endYear, SEASONS[idx].endMonth - 1, 1) - TZ_MS;
  return { idx, left: Math.max(0, endMs - nowMs) };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function SeasonCountdown({ lang }: { lang: string }) {
  const [now, setNow] = useState<number | null>(null); // только в браузере — без расхождения с SSR

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (now === null) return null;
  const { idx, left } = seasonState(now);
  const s = Math.floor(left / 1000);
  const parts = [
    { v: Math.floor(s / 86400), ru: "д", tj: "р" },
    { v: Math.floor((s % 86400) / 3600), ru: "ч", tj: "с" },
    { v: Math.floor((s % 3600) / 60), ru: "м", tj: "д" },
    { v: s % 60, ru: "с", tj: "с" },
  ];
  const ru = lang === "ru";
  const season = SEASONS[idx];

  const name = ru ? season.ru : season.tj;

  return (
    <div className="season-cd" aria-label={name}>
      <span className="season-cd-title">{name}</span>
      {parts.map((p, i) => (
        <span key={i} className="season-cd-part">
          {i > 0 && <span className="season-cd-sep">:</span>}
          <span className="season-cd-num">{pad(p.v)}</span>
          <span className="season-cd-lbl">{ru ? p.ru : p.tj}</span>
        </span>
      ))}
    </div>
  );
}
