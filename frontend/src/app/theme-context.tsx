"use client";

import { ReactNode, useSyncExternalStore } from "react";

type Theme = "dark" | "light";

// Тема живёт в localStorage + атрибуте <html data-theme> (ставится splashScript до загрузки React).
// useSyncExternalStore при гидратации отдаёт серверное значение ("light") — HTML совпадает,
// сразу после гидратации компонент перерисовывается с сохранённой темой. Работает и внутри <Suspense>.
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function getSnapshot(): Theme {
  try {
    return localStorage.getItem("theme") === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function getServerSnapshot(): Theme {
  return "light";
}

function toggleTheme() {
  const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
  try { localStorage.setItem("theme", next); } catch {}
  document.documentElement.setAttribute("data-theme", next);
  listeners.forEach((l) => l());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { theme, toggleTheme };
}
