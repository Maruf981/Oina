"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type City = "dushanbe" | "other";

type CityContextType = {
  city: City;
  toggleCity: () => void;
};

const CityContext = createContext<CityContextType | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<City>("dushanbe");

  useEffect(() => {
    const saved = localStorage.getItem("city") as City | null;
    if (saved) setCity(saved);
  }, []);

  const toggleCity = () => {
    const next = city === "dushanbe" ? "other" : "dushanbe";
    setCity(next);
    localStorage.setItem("city", next);
  };

  return (
    <CityContext.Provider value={{ city, toggleCity }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error("useCity must be used within CityProvider");
  return ctx;
}
