"use client";

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useAuth } from "./auth-context";

export type CartItem = {
  variantId: number;
  productId: number;
  title: string;
  catalogNumber: string;
  price: number;
  size: string;
  color: string;
  qty: number;
};

type ServerCartItem = {
  id: number;
  quantity: number;
  variant: {
    id: number;
    size: string;
    color: string;
    product: {
      id: number;
      title_ru: string;
      title_tj: string | null;
      catalog_number: string | null;
      price: number;
    };
  };
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => Promise<{ ok: boolean; error?: string }>;
  removeItem: (variantId: number) => void;
  updateQty: (variantId: number, qty: number) => void;
  clearCart: () => void;
  totalCount: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | null>(null);
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function serverItemToCartItem(s: ServerCartItem): CartItem {
  return {
    variantId: s.variant.id,
    productId: s.variant.product.id,
    title: s.variant.product.title_ru,
    catalogNumber: s.variant.product.catalog_number || "",
    price: s.variant.product.price,
    size: s.variant.size,
    color: s.variant.color,
    qty: s.quantity,
  };
}

// map variantId -> server cart item id, needed for PATCH/DELETE by server id
const serverIdMap = new Map<number, number>();

export function CartProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const guestMergedRef = useRef(false);

  const authHeaders = () => ({ Authorization: `Bearer ${auth.token}` });

  const loadServerCart = async () => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API_URL}/cart/`, { headers: authHeaders() });
      if (!res.ok) return;
      const data: ServerCartItem[] = await res.json();
      serverIdMap.clear();
      data.forEach((s) => serverIdMap.set(s.variant.id, s.id));
      setItems(data.map(serverItemToCartItem));
    } catch {
      // network error, keep current state
    }
  };

  // Load guest cart from localStorage on first mount (before we know auth state)
  useEffect(() => {
    if (!auth.token) {
      const saved = localStorage.getItem("cart");
      if (saved) {
        try {
          setItems(JSON.parse(saved));
        } catch {
          // ignore corrupt data
        }
      }
    }
  }, []);

  // Persist guest cart to localStorage whenever items change while logged out
  useEffect(() => {
    if (!auth.token) {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items, auth.token]);

  // When auth.token appears (login), merge any local guest cart into server cart, then load server cart
  useEffect(() => {
    const run = async () => {
      if (!auth.token || guestMergedRef.current) return;
      guestMergedRef.current = true;

      const saved = localStorage.getItem("cart");
      let guestItems: CartItem[] = [];
      if (saved) {
        try {
          guestItems = JSON.parse(saved);
        } catch {
          guestItems = [];
        }
      }

      for (const gi of guestItems) {
        try {
          await fetch(`${API_URL}/cart/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ product_variant_id: gi.variantId, quantity: gi.qty }),
          });
        } catch {
          // skip failed item
        }
      }

      localStorage.removeItem("cart");
      await loadServerCart();
    };
    run();
  }, [auth.token]);

  // When logged out, reset merge flag so a future login re-merges correctly
  useEffect(() => {
    if (!auth.token) {
      guestMergedRef.current = false;
    }
  }, [auth.token]);

  const addItem = async (item: Omit<CartItem, "qty">, qty: number = 1): Promise<{ ok: boolean; error?: string }> => {
    if (!auth.token) {
      setItems((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          return prev.map((i) => (i.variantId === item.variantId ? { ...i, qty: i.qty + qty } : i));
        }
        return [...prev, { ...item, qty }];
      });
      return { ok: true };
    }
    try {
      const res = await fetch(`${API_URL}/cart/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ product_variant_id: item.variantId, quantity: qty }),
      });
      if (res.ok) {
        await loadServerCart();
        return { ok: true };
      }
      const err = await res.json().catch(() => null);
      return { ok: false, error: err?.detail };
    } catch {
      return { ok: false };
    }
  };

  const removeItem = async (variantId: number) => {
    if (!auth.token) {
      setItems((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    const serverId = serverIdMap.get(variantId);
    if (!serverId) return;
    try {
      await fetch(`${API_URL}/cart/${serverId}`, { method: "DELETE", headers: authHeaders() });
      await loadServerCart();
    } catch {
      // ignore
    }
  };

  const updateQty = async (variantId: number, qty: number) => {
    if (qty < 1) return;
    if (!auth.token) {
      setItems((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)));
      return;
    }
    const serverId = serverIdMap.get(variantId);
    if (!serverId) return;
    try {
      await fetch(`${API_URL}/cart/${serverId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ quantity: qty }),
      });
      await loadServerCart();
    } catch {
      // ignore
    }
  };
  const clearCart = async () => {
    if (!auth.token) {
      setItems([]);
      localStorage.removeItem("cart");
      return;
    }
    try {
      await fetch(`${API_URL}/cart/`, { method: "DELETE", headers: authHeaders() });
      setItems([]);
      serverIdMap.clear();
    } catch {
      // ignore
    }
  };

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.qty * i.price, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, totalCount, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
