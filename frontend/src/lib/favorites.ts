"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "../app/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const GUEST_KEY = "guest_favorites";

export function useFavorites() {
  const auth = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [favHydrated, setFavHydrated] = useState(false);
  const mergedRef = useRef(false);

  useEffect(() => {
    if (!auth.token) {
      const saved = localStorage.getItem(GUEST_KEY);
      if (saved) {
        try {
          setFavoriteIds(new Set(JSON.parse(saved)));
        } catch {}
      }
    }
  setFavHydrated(true);
  }, []);

  useEffect(() => {
    if (!favHydrated) return;
    if (!auth.token) {
      localStorage.setItem(GUEST_KEY, JSON.stringify(Array.from(favoriteIds)));
    }
  }, [favoriteIds, auth.token, favHydrated]);

  useEffect(() => {
    const run = async () => {
      if (!auth.token || mergedRef.current) return;
      mergedRef.current = true;

      const saved = localStorage.getItem(GUEST_KEY);
      let guestIds: number[] = [];
      if (saved) {
        try {
          guestIds = JSON.parse(saved);
        } catch {
          guestIds = [];
        }
      }

      for (const productId of guestIds) {
        try {
          await fetch(`${API_URL}/favorites/${productId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${auth.token}` },
          });
        } catch {}
      }

      localStorage.removeItem(GUEST_KEY);

      try {
        const res = await fetch(`${API_URL}/favorites/`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const favs: { product: { id: number } }[] = res.ok ? await res.json() : [];
        setFavoriteIds(new Set(favs.map((f) => f.product.id)));
      } catch {}
    };
    run();
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) mergedRef.current = false;
  }, [auth.token]);

  const toggleFavorite = async (productId: number) => {
    const isFav = favoriteIds.has(productId);

    const flip = () =>
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(productId);
        else next.add(productId);
        return next;
      });

    if (!auth.token) {
      flip();
      return;
    }

    try {
      const res = await fetch(`${API_URL}/favorites/${productId}`, {
        method: isFav ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) return;
      flip();
    } catch {}
  };

  const isFavorite = (productId: number) => favoriteIds.has(productId);

  return { favoriteIds, isFavorite, toggleFavorite };
}
