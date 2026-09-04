"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Telegram: any;
  }
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const COLOR_MAP: Record<string, string> = {
  "красный": "#E24B4A", "тёмно-красный": "#8B1E1E", "бордовый": "#7A1F2B",
  "синий": "#378ADD", "тёмно-синий": "#1B3A5C", "голубой": "#85B7EB", "светло-голубой": "#BFE0F5",
  "зелёный": "#639922", "тёмно-зелёный": "#2F4A17", "изумрудный": "#0F6E56",
  "жёлтый": "#EF9F27", "горчичный": "#B8860B",
  "оранжевый": "#D85A30", "терракотовый": "#C1653D",
  "фиолетовый": "#7F77DD", "сиреневый": "#B39DDB", "лавандовый": "#C9B8E8",
  "розовый": "#D4537E", "пудровый": "#E8C4C4",
  "чёрный": "#1A1A1A", "белый": "#F5F5F0",
  "серый": "#888780", "светло-серый": "#C7C5BD", "тёмно-серый": "#4A4A47",
  "бежевый": "#D8CBB8", "коричневый": "#8B5A2B", "хаки": "#7C7A5C",
  "мятный": "#9FE1CB", "золотой": "#C9A648", "серебристый": "#C0C0C0",
  "малиновый": "#B22245", "лимонный": "#E8D44D", "молочный": "#F2ECD9", "кремовый": "#EFE3C8",
};
const COLOR_OPTIONS = Object.keys(COLOR_MAP).map((k) => k.charAt(0).toUpperCase() + k.slice(1));
const getColorHex = (name: string) => COLOR_MAP[name.trim().toLowerCase()] || "#666";
const getContrastText = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1A1A1A" : "#FFFFFF";
};

const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"];
const NUMERIC_SIZES = Array.from({ length: 50 - 15 + 1 }, (_, i) => String(15 + i));

type SizeType = "letter" | "numeric" | "onesize" | "custom";
type ColorEntry = {
  color: string;
  sizeType: SizeType;
  sizes: Record<string, number>;
  customInput: string;
};
type GuideRow = { size: string; chest: string; waist: string; garment_length: string; sleeve_length: string; shoulder_width: string };

export default function WebAppPage() {
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [activeColors, setActiveColors] = useState<ColorEntry[]>([]);
  const [guide, setGuide] = useState<Record<string, GuideRow>>({});
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

  const toggleColor = (color: string) => {
    if (activeColors.find((c) => c.color === color)) {
      setActiveColors(activeColors.filter((c) => c.color !== color));
    } else {
      setActiveColors([...activeColors, { color, sizeType: "letter", sizes: {}, customInput: "" }]);
    }
  };

  const updateColorEntry = (color: string, patch: Partial<ColorEntry>) => {
    setActiveColors(activeColors.map((c) => (c.color === color ? { ...c, ...patch } : c)));
  };

  const toggleSize = (color: string, size: string) => {
    const entry = activeColors.find((c) => c.color === color);
    if (!entry) return;
    const sizes = { ...entry.sizes };
    if (size in sizes) {
      delete sizes[size];
    } else {
      sizes[size] = 1;
    }
    updateColorEntry(color, { sizes });
  };

  const setSizeStock = (color: string, size: string, stock: number) => {
    const entry = activeColors.find((c) => c.color === color);
    if (!entry) return;
    updateColorEntry(color, { sizes: { ...entry.sizes, [size]: stock } });
  };

  const allSizesUsed = Array.from(
    new Set(activeColors.flatMap((c) => Object.keys(c.sizes)))
  );

  const updateGuideField = (size: string, field: keyof GuideRow, value: string) => {
    setGuide((prev) => ({
      ...prev,
      [size]: {
        size,
        chest: prev[size]?.chest ?? "",
        waist: prev[size]?.waist ?? "",
        garment_length: prev[size]?.garment_length ?? "",
        sleeve_length: prev[size]?.sleeve_length ?? "",
        shoulder_width: prev[size]?.shoulder_width ?? "",
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    if (!title) {
      alert("Укажи название");
      return;
    }
    if (!categoryId) {
      alert("Укажи категорию");
      return;
    }
    setSaving(true);
    try {
      const loginRes = await fetch(`${API}/telegram-auth/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ init_data: window.Telegram?.WebApp?.initData || initData }),
      });
      if (!loginRes.ok) throw new Error("Login failed");
      const { access_token } = await loginRes.json();

      const variants = activeColors.flatMap((c) =>
        Object.entries(c.sizes).map(([size, stock]) => ({
          size,
          color: c.color,
          stock,
        }))
      );
      const guidePayload = allSizesUsed
        .filter((s) => guide[s])
        .map((s) => guide[s]);

      const productRes = await fetch(`${API}/products/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({
          category_id: categoryId,
          title_ru: title,
          price: price ? Number(price) : 0,
          cost_price: costPrice ? Number(costPrice) : null,
          is_active: false,
          size_guide: guidePayload,
          variants,
        }),
      });
      if (!productRes.ok) throw new Error("Save failed");
      const product = await productRes.json();

      if (photo) {
        const imgFormData = new FormData();
        imgFormData.append("file", photo);
        await fetch(`${API}/upload/product-image/${product.id}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${access_token}` },
          body: imgFormData,
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
        <span style={{ fontSize: 18 }}>✅ Черновик товара сохранён</span>
      </div>
    );
  }

  return (
    <div style={{ background: "#0E0E10", color: "#F2F0EA", minHeight: "100vh", padding: 20, paddingBottom: 100, fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: 20 }}>Новый черновик товара</h2>

      <label style={{ display: "block", marginBottom: 12 }}>
        <div style={{ padding: 14, background: "#18181B", border: "1px dashed #2A2A2E", textAlign: "center", borderRadius: 4, cursor: "pointer" }}>
          📷 {photo ? "Фото добавлено ✓" : "Добавить фото"}
        </div>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
      </label>

      <select value={categoryId ?? ""} onChange={(e) => setCategoryId(Number(e.target.value))} style={inputStyle}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input placeholder="Название товара" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <input type="number" placeholder="Закуп-цена" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
        <input type="number" placeholder="Цена продажи" value={price} onChange={(e) => setPrice(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
      </div>

      <div style={{ marginBottom: 8, fontSize: 13, opacity: 0.7 }}>Цвета</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {COLOR_OPTIONS.map((color) => {
          const active = !!activeColors.find((c) => c.color === color);
          const hex = getColorHex(color);
          return (
            <button
              key={color}
              type="button"
              onClick={() => toggleColor(color)}
              style={{
                padding: "6px 12px",
                borderRadius: 20,
                border: active ? `2px solid ${hex}` : "1px solid #2A2A2E",
                background: active ? hex : "#18181B",
                color: active ? getContrastText(hex) : "#F2F0EA",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {color}
            </button>
          );
        })}
      </div>

      {activeColors.map((entry) => {
        const sizes =
          entry.sizeType === "numeric" ? NUMERIC_SIZES :
          entry.sizeType === "onesize" ? ["Безразмерный"] :
          entry.sizeType === "custom" ? Object.keys(entry.sizes) :
          LETTER_SIZES;
        const hex = getColorHex(entry.color);
        return (
          <div key={entry.color} style={{ border: "1px solid #2A2A2E", borderRadius: 4, padding: 12, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: hex }} />
              <span style={{ fontSize: 14 }}>{entry.color}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
              {(["letter", "numeric", "onesize", "custom"] as SizeType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateColorEntry(entry.color, { sizeType: type })}
                  style={{
                    padding: "5px 10px",
                    fontSize: 11,
                    borderRadius: 4,
                    border: "1px solid #2A2A2E",
                    background: entry.sizeType === type ? "#F2F0EA" : "#18181B",
                    color: entry.sizeType === type ? "#0E0E10" : "#F2F0EA",
                    cursor: "pointer",
                  }}
                >
                  {type === "letter" ? "Буквенный" : type === "numeric" ? "Числовой" : type === "onesize" ? "Безразмер" : "Свой"}
                </button>
              ))}
            </div>
            {entry.sizeType === "custom" ? (
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <input
                  placeholder="Введите размер"
                  value={entry.customInput}
                  onChange={(e) => updateColorEntry(entry.color, { customInput: e.target.value })}
                  style={{ flex: 1, padding: 8, fontSize: 13, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = entry.customInput.trim();
                    if (!v) return;
                    setSizeStock(entry.color, v, 1);
                    updateColorEntry(entry.color, { customInput: "" });
                  }}
                  style={{ padding: "8px 14px", background: "#F2F0EA", color: "#0E0E10", border: "none", borderRadius: 4, fontSize: 13 }}
                >
                  +
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sizes.map((size) => {
                  const isActive = size in entry.sizes;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => toggleSize(entry.color, size)}
                      style={{
                        padding: "6px 10px",
                        fontSize: 12,
                        borderRadius: 4,
                        border: "1px solid #2A2A2E",
                        background: isActive ? "#F2F0EA" : "#0E0E10",
                        color: isActive ? "#0E0E10" : "#F2F0EA",
                        cursor: "pointer",
                      }}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            )}
            {Object.keys(entry.sizes).length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                {Object.entries(entry.sizes).map(([size, stock]) => (
                  <div key={size} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <span style={{ opacity: 0.7 }}>{size}:</span>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setSizeStock(entry.color, size, Number(e.target.value))}
                      style={{ width: 50, padding: 4, fontSize: 12, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {allSizesUsed.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 10, fontSize: 13, opacity: 0.7 }}>Гид по размерам (см)</div>
          {allSizesUsed.map((size) => (
            <div key={size} style={{ border: "1px solid #2A2A2E", borderRadius: 4, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>{size}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input placeholder="Грудь" value={guide[size]?.chest ?? ""} onChange={(e) => updateGuideField(size, "chest", e.target.value)} style={{ padding: 8, fontSize: 13, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4 }} />
                <input placeholder="Талия" value={guide[size]?.waist ?? ""} onChange={(e) => updateGuideField(size, "waist", e.target.value)} style={{ padding: 8, fontSize: 13, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4 }} />
                <input placeholder="Длина изделия" value={guide[size]?.garment_length ?? ""} onChange={(e) => updateGuideField(size, "garment_length", e.target.value)} style={{ padding: 8, fontSize: 13, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4 }} />
                <input placeholder="Длина рукава" value={guide[size]?.sleeve_length ?? ""} onChange={(e) => updateGuideField(size, "sleeve_length", e.target.value)} style={{ padding: 8, fontSize: 13, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4 }} />
                <input placeholder="Ширина плеч" value={guide[size]?.shoulder_width ?? ""} onChange={(e) => updateGuideField(size, "shoulder_width", e.target.value)} style={{ padding: 8, fontSize: 13, background: "#0E0E10", border: "1px solid #2A2A2E", color: "#F2F0EA", borderRadius: 4, gridColumn: "1 / -1" }} />
              </div>
            </div>
          ))}
        </div>
      )}

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
          marginTop: 20,
        }}
      >
        {saving ? "Сохраняем..." : "Создать черновик"}
      </button>
    </div>
  );
}
