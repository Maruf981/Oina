"use client";

import { useEffect } from "react";

export function ThemeSync() {
  useEffect(() => {
    const applyTheme = () => {
      const saved = localStorage.getItem("theme") as "dark" | "light" | null;
      document.documentElement.setAttribute("data-theme", saved || "dark");
    };

    applyTheme();

    const interval = setInterval(applyTheme, 300);
    return () => clearInterval(interval);
  }, []);

  return null;
}
