"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function Splash() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      try { sessionStorage.setItem("oina-splash", "1"); } catch {}
      setHidden(true);
      setTimeout(() => setGone(true), 500);
    };
    const min = new Promise((r) => setTimeout(r, 900));
    const ready = new Promise<void>((r) => {
      if (pathname !== "/" || document.documentElement.dataset.oinaReady) return r();
      window.addEventListener("oina:ready", () => r(), { once: true });
    });
    Promise.all([min, ready]).then(hide);
    const max = setTimeout(hide, 6000);
    return () => clearTimeout(max);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;
  return (
    <div id="oina-splash" className={hidden ? "is-hidden" : ""} aria-hidden="true">
      <div className="oina-splash__box">
        <img src="/splash-logo.webp" alt="" className="oina-splash__logo" />
        <p className="oina-splash__text">T.oina.tj</p>
        <div className="oina-splash__bar"><span /></div>
      </div>
    </div>
  );
}
