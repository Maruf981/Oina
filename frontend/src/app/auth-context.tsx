"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Customer = {
  id: number;
  name: string | null;
  phone: string;
};

type AuthContextType = {
  customer: Customer | null;
  token: string | null;
  login: (phone: string, password: string) => Promise<void>;
  register: (name: string, phone: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("auth_token");
    if (saved) {
      setToken(saved);
      fetchMe(saved);
    }
  }, []);

  const fetchMe = async (t: string) => {
    try {
    const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setCustomer(await res.json());
      } else {
        localStorage.removeItem("auth_token");
        setToken(null);
      }
    } catch {
      // network error, ignore
    }
  };

  const login = async (phone: string, password: string) => {
    const res = await fetch("http://127.0.0.1:8000/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const data = await res.json();
    localStorage.setItem("auth_token", data.access_token);
    setToken(data.access_token);
    await fetchMe(data.access_token);
  };

  const register = async (name: string, phone: string, password: string) => {
    const res = await fetch("http://127.0.0.1:8000/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, password }),
    });
    if (!res.ok) throw new Error("Register failed");
    const data = await res.json();
    localStorage.setItem("auth_token", data.access_token);
    setToken(data.access_token);
    await fetchMe(data.access_token);
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setToken(null);
    setCustomer(null);
  };

  return (
    <AuthContext.Provider value={{ customer, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}