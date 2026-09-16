"use client";

import { useEffect, useState } from "react";

const EMPTY = { button_text: "", title: "", category_id: "", sort_order: 0, is_active: true };

export function DualSlidesSection({ api, authFetch, categories }: any) {
  const [slides, setSlides] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [leftFile, setLeftFile] = useState<File | null>(null);
  const [rightFile, setRightFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    authFetch(`${api}/dual-slides/?active_only=false`)
      .then((r: any) => r.json())
      .then((d: any) => setSlides(Array.isArray(d) ? d : []))
      .catch(() => setSlides([]));

  useEffect(() => { refresh(); }, []);

  const reset = () => {
    setForm(EMPTY); setLeftFile(null); setRightFile(null);
    setEditingId(null); setCreating(false); setError("");
  };

  const payloadOf = (f: any) => ({
    title: f.title || "",
    subtitle: null,
    button_text: f.button_text || null,
    text_color: "#FFFFFF",
    category_id: f.category_id ? Number(f.category_id) : null,
    sort_order: Number(f.sort_order) || 0,
    is_active: f.is_active,
  });

  const startEdit = (s: any) => {
    setForm({ button_text: s.button_text || "", title: s.title || "", category_id: s.category_id || "", sort_order: s.sort_order ?? 0, is_active: s.is_active });
    setEditingId(s.id); setCreating(true); setLeftFile(null); setRightFile(null); setError("");
  };

  const save = async () => {
    setError("");
    if (!form.button_text.trim() || !form.title.trim()) return setError("Заполните оба текста в шаре");
    if (!editingId && (!leftFile || !rightFile)) return setError("Загрузите оба фото");
    setSaving(true);
    const res = await authFetch(editingId ? `${api}/dual-slides/${editingId}` : `${api}/dual-slides/`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadOf(form)),
    });
    if (!res.ok) { setSaving(false); return setError("Не удалось сохранить"); }
    const saved = await res.json();
    for (const [side, file] of [["left", leftFile], ["right", rightFile]] as const) {
      if (!file) continue;
      const fd = new FormData();
      fd.append("file", file);
      const up = await authFetch(`${api}/upload/dual-slide-image/${saved.id}?side=${side}`, { method: "POST", body: fd });
      if (!up.ok) { setSaving(false); return setError(`Не удалось загрузить ${side === "left" ? "левое" : "правое"} фото`); }
    }
    setSaving(false); reset(); refresh();
  };

  const remove = async (id: number) => {
    if (!window.confirm("Удалить слайд безвозвратно?")) return;
    await authFetch(`${api}/dual-slides/${id}`, { method: "DELETE" });
    refresh();
  };

  const toggle = async (s: any) => {
    await authFetch(`${api}/dual-slides/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadOf({ ...s, is_active: !s.is_active })),
    });
    refresh();
  };

  const inputStyle = { width: "100%", padding: 10, marginBottom: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", boxSizing: "border-box" as const };
  const thumb = (url: string | null) => ({ width: 80, height: 80, flexShrink: 0, backgroundColor: "var(--surface)", backgroundImage: url ? `url(${url})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--line)" });

  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
      <h3 className="product-title" style={{ fontSize: 18, marginBottom: 6 }}>Двойные слайды</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Показываются на главной после первых 24 товаров. Фото: квадрат 1200×1200.</p>

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          + Добавить двойной слайд
        </button>
      ) : (
        <div style={{ maxWidth: 480, marginBottom: 24, border: "1px solid var(--line)", padding: 20 }}>
          <input placeholder="Шар над левым фото (например: Рубашка)" value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} style={inputStyle} />
          <input placeholder="Шар над правым фото (например: Смотреть)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={inputStyle} />
          <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={inputStyle}>
            <option value="">— Категория (куда ведёт клик) —</option>
            {(Array.isArray(categories) ? categories : []).filter((c: any) => !c.parent_id).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input type="number" placeholder="Порядок" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} style={inputStyle} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 13 }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Активен
          </label>
          <label style={{ display: "block", marginBottom: 10, fontSize: 13, color: "var(--text-muted)" }}>
            Левое фото{editingId ? " (пусто = не менять)" : ""}
            <input type="file" accept="image/*" onChange={(e) => setLeftFile(e.target.files?.[0] ?? null)} style={{ display: "block", marginTop: 6 }} />
          </label>
          <label style={{ display: "block", marginBottom: 10, fontSize: 13, color: "var(--text-muted)" }}>
            Правое фото{editingId ? " (пусто = не менять)" : ""}
            <input type="file" accept="image/*" onChange={(e) => setRightFile(e.target.files?.[0] ?? null)} style={{ display: "block", marginTop: 6 }} />
          </label>
          {error && <p style={{ color: "#E24B4A", fontSize: 13, marginBottom: 10 }}>{error}</p>}
          <div style={{ display: "flex", gap: 10 }}>
            <button disabled={saving} onClick={save} style={{ padding: "10px 16px", background: "var(--text)", color: "var(--bg)", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Сохранение..." : "Сохранить"}</button>
            <button onClick={reset} style={{ padding: "10px 16px", background: "transparent", color: "var(--text)", border: "1px solid var(--line)", cursor: "pointer" }}>Отмена</button>
          </div>
        </div>
      )}

      {slides.length === 0 && <p style={{ color: "var(--text-muted)" }}>Двойных слайдов пока нет</p>}

      {slides.map((s) => (
        <div key={s.id} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", opacity: s.is_active ? 1 : 0.5 }}>
          <div style={{ display: "flex", gap: 2 }}>
            <div style={thumb(s.left_image_url)} />
            <div style={thumb(s.right_image_url)} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
              <span className="product-title" style={{ fontSize: 17 }}>{s.button_text || "—"} / {s.title || "—"}</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span onClick={() => startEdit(s)} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12, textDecoration: "underline" }}>Изменить</span>
                <span onClick={() => toggle(s)} style={{ cursor: "pointer", color: "var(--text)", fontSize: 12, textDecoration: "underline" }}>{s.is_active ? "Выключить" : "Включить"}</span>
                <span onClick={() => remove(s.id)} style={{ cursor: "pointer", color: "#E24B4A", fontSize: 12, textDecoration: "underline" }}>Удалить</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Категория: {s.category ? s.category.name : "—"} · Порядок: {s.sort_order}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
