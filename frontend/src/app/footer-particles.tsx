"use client";
import { useEffect, useRef } from "react";

// Фон футера: точки летят из глубины на зрителя (как у Lavanda). Цвет — из --ft-text, фон футера не трогаем.
export function FooterParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;

    // цвет точек = цвет текста футера
    const raw = getComputedStyle(host).getPropertyValue("--ft-text").trim() || "#EFE9E0";
    const hex = raw.replace("#", "");
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const num = parseInt(full, 16);
    const rgb = Number.isNaN(num) ? "239,233,224" : `${(num >> 16) & 255},${(num >> 8) & 255},${num & 255}`;

    const N = mobile ? 700 : 1800;
    const SPEED = 0.028;     // скорость полёта (глубин в секунду) — медленно
    const Z_NEAR = 0.04;     // ближе этого — точка «пролетела», рождаем заново вдали
    type P = { x: number; y: number; z: number; ph: number; sp: number; age: number };
    const spawn = (p: P, anyDepth: boolean) => {
      // равномерно по кругу вокруг оси полёта
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 1.1;
      p.x = Math.cos(a) * r;
      p.y = Math.sin(a) * r;
      p.z = anyDepth ? Z_NEAR + Math.random() * (1 - Z_NEAR) : 1;
      p.age = 0;                           // для плавного появления
      p.ph = Math.random() * Math.PI * 2;  // фаза мерцания
      p.sp = 1.5 + Math.random() * 3;      // скорость мерцания
    };
    const pts: P[] = Array.from({ length: N }, () => { const p = { x: 0, y: 0, z: 1, ph: 0, sp: 1, age: 0 }; spawn(p, true); return p; });

    let w = 0, h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // центр полёта слегка следует за мышью
    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => {
      const r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 0.08;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 0.08;
    };
    host.addEventListener("mousemove", onMove);

    const draw = (t: number, dt: number) => {
      ctx.clearRect(0, 0, w, h);
      mx += (tx - mx) * 0.04;
      my += (ty - my) * 0.04;
      const cx = w * (0.5 + mx), cy = h * (0.5 + my);
      const scale = Math.max(w, h) * 0.12;
      for (const p of pts) {
        p.z -= SPEED * dt;
        p.age += dt;
        if (p.z <= Z_NEAR) { spawn(p, true); continue; }
        const sx = cx + (p.x / p.z) * scale;
        const sy = cy + (p.y / p.z) * scale;
        if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) { spawn(p, true); continue; }
        const near = 1 - p.z;                       // 0 далеко .. 1 близко
        const fadeIn = Math.min(1, (1 - p.z) / 0.15); // плавно появляются вдали
        const twinkle = 0.55 + 0.45 * Math.sin(t * 0.001 * p.sp + p.ph); // блеск: яркость пульсирует
        const a = Math.min(1, (0.2 + 0.8 * near) * fadeIn * twinkle * Math.min(1, p.age / 0.8));
        const radius = 0.45 + 1.1 * near * near;   // круглая точка, без ореола
        ctx.fillStyle = `rgba(${rgb},${a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let visible = true;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      raf = 0;
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      draw(t, dt);
      if (visible && !reduce) raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } };
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) start(); }, { threshold: 0 });
    io.observe(host);
    start();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      host.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="ft-particles" aria-hidden="true" />;
}
