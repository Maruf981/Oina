"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Lang } from "./translations";

type LangContextType = {
  lang: Lang;
  toggleLang: () => void;
};

const LangContext = createContext<LangContextType | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ru");

  useEffect(() => {
    const saved = localStorage.getItem("lang") as Lang | null;
    if (saved) setLang(saved);
  }, []);

  const toggleLang = () => {
    const next = lang === "ru" ? "tj" : "ru";
    setLang(next);
    localStorage.setItem("lang", next);
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
