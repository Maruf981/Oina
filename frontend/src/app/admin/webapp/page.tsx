"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram: any;
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function WebAppPage() {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [initData, setInitData] = useState("");

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      setInitData(window.Telegram.WebApp.initData);
    }
    fetch(`${API}/categories/`)
      .then((r) => r.json())
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      });
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos([...photos, ...Array.from(e.target.files)]);
    }
  };

  const handleSubmit = async () => {
    if (!categoryId || !title || !price) {
      alert("Заполни название, цену и категорию");
      return;
    }
    setSaving(true);
    try {
      const loginRes = await fetch(`${API}/telegram-auth/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: initData }),
      });
      if (!loginRes.ok) {
        const err = await loginRes.json();
        throw new Error(`Login failed: ${JSON.stringify(err)}`);
      }
      const { access_token } = await loginRes.json();

      const variants = size || color || stock
        ? [{ size, color, stock: Number(stock) || 0, sku: `draft-${Date.now()}` }]
        : [];

      const productRes = await fetch(`${API}/products/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({
          category_id: categoryId,
          title_ru: title,
          price: Number(price),
          is_active: false,
          variants,
        }),
      });
     if (!productRes.ok) {
        const err = await productRes.json();
        throw new Error(`Product creation failed: ${JSON.stringify(err)}`);
      }
      const product = await productRes.json();

      for (const photo of photos) {
        const formData = new FormData();
        formData.append("file", photo);
        await fetch(`${API}/upload/product-image/${product.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access_token}` },
          body: formData,
        });
      }

      setDone(true);
      setTimeout(() => window.Telegram?.WebApp?.close(), 1500);
    } catch (err) {
      alert("Ошибка сохранения. Попробуй ещё раз.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: 14,
    marginBottom: 12,
    background: "#18181B",
    border: "1px solid #2A2A2E",
    color: "#F2F0EA",
    fontSize: 16,
    boxSizing: "border-box" as const,
    borderRadius: 4,
  };

  if (done) {
    return (
      <div style={{ background: "#0E0E10", color: "#F2F0EA", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <span style={{ fontSize: 18 }}>✅ Черновик сохранён</span>
      </div>
    );
  }

  return (
    <div style={{ background: "#0E0E10", color: "#F2F0EA", minHeight: "100vh", padding: 20, fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: 20 }}>Добавить товар</h2>

      <select value={categoryId ?? ""} onChange={(e) => setCategoryId(Number(e.target.value))} style={inputStyle}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input placeholder="Название товара" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <input type="number" placeholder="Цена (смн)" value={price} onChange={(e) => setPrice(e.target.value)} style={inputStyle} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <input placeholder="Размер" value={size} onChange={(e) => setSize(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
        <input placeholder="Цвет" value={color} onChange={(e) => setColor(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
      </div>
      <input type="number" placeholder="Остаток на складе" value={stock} onChange={(e) => setStock(e.target.value)} style={inputStyle} />

      <label style={{ display: "block", marginBottom: 12 }}>
        <div style={{ padding: 14, background: "#18181B", border: "1px dashed #2A2A2E", textAlign: "center", borderRadius: 4, cursor: "pointer" }}>
          📷 Добавить фото ({photos.length})
        </div>
        <input type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display: "none" }} />
      </label>

      <button
        onClick={handleSubmit}
        disabled={saving}
        style={{
          width: "100%",
          padding: 16,
          background: "#F2F0EA",
          color: "#0E0E10",
          border: "none",
          borderRadius: 4,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Сохраняем..." : "Сохранить черновик"}
      </button>
    </div>
  );
}