"use client";

import { useEffect, useState } from "react";
import { cldVideoPoster, isVideoUrl } from "../../lib/cld";

const MAX_VIDEO_MB = 50;

const SIDES = [
  ["left", "Левое"],
  ["center", "Среднее"],
  ["right", "Правое"],
] as const;
type SideKey = (typeof SIDES)[number][0];

const EMPTY = {
  left_label_ru: "", left_label_tj: "",
  center_label_ru: "", center_label_tj: "",
  right_label_ru: "", right_label_tj: "",
  category_id: "", sort_order: 0, is_active: true,
};
const NO_FILES: Record<SideKey, File | null> = { left: null, center: null, right: null };

export function DualSlidesSection({ api, authFetch, categories }: any) {
  const [slides, setSlides] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [files, setFiles] = useState<Record<SideKey, File | null>>(NO_FILES);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    authFetch(`${api}/dual-slides/?active_only=false`)
      .then((r: any) => r.json())
      .then((d: any) => setSlides(Array.isArray(d) ? d : []))
      .catch(() => setSlides([]));

  useEffect(() => { refresh(); }, []);

  const reset = () => {
    setForm(EMPTY); setFiles(NO_FILES);
    setEditingId(null); setCreating(false); setError("");
  };

  const payloadOf = (f: any) => ({
    title: f.right_label_ru || f.title || "",
    subtitle: null,
    button_text: f.left_label_ru || f.button_text || null,
    text_color: "#FFFFFF",
    category_id: f.category_id ? Number(f.category_id) : null,
    sort_order: Number(f.sort_order) || 0,
    is_active: f.is_active,
    left_label_ru: f.left_label_ru || null,
    left_label_tj: f.left_label_tj || null,
    center_label_ru: f.center_label_ru || null,
    center_label_tj: f.center_label_tj || null,
    right_label_ru: f.right_label_ru || null,
    right_label_tj: f.right_label_tj || null,
  });

  const startEdit = (s: any) => {
    setForm({
      left_label_ru: s.left_label_ru || s.button_text || "",
      left_label_tj: s.left_label_tj || "",
      center_label_ru: s.center_label_ru || "",
      center_label_tj: s.center_label_tj || "",
      right_label_ru: s.right_label_ru || s.title || "",
      right_label_tj: s.right_label_tj || "",
      category_id: s.category_id || "",
      sort_order: s.sort_order ?? 0,
      is_active: s.is_active,
    });
    setEditingId(s.id); setCreating(true); setFiles(NO_FILES); setError("");
  };

  const save = async () => {
    setError("");
    if (SIDES.some(([k]) => !String(form[`${k}_label_ru`] || "").trim())) return setError("Заполните текст шара (RU) для всех трёх фото");
    if (!editingId && SIDES.some(([k]) => !files[k])) return setError("Загрузите все три фото или видео");
    const big = SIDES.find(([k]) => files[k]?.type.startsWith("video/") && files[k]!.size > MAX_VIDEO_MB * 1024 * 1024);
    if (big) return setError(`${big[1]} видео больше ${MAX_VIDEO_MB} МБ`);
    setSaving(true);
    const res = await authFetch(editingId ? `${api}/dual-slides/${editingId}` : `${api}/dual-slides/`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadOf(form)),
    });
    if (!res.ok) { setSaving(false); return setError("Не удалось сохранить"); }
    const saved = await res.json();
    for (const [side, name] of SIDES) {
      const file = files[side];
      if (!file) continue;
      const fd = new FormData();
      fd.append("file", file);
      const up = await authFetch(`${api}/upload/dual-slide-image/${saved.id}?side=${side}`, { method: "POST", body: fd });
      if (!up.ok) { setSaving(false); return setError(`Не удалось загрузить ${name.toLowerCase()} фото/видео`); }
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
  const thumb = (url: string | null) => ({ width: 60, height: 80, flexShrink: 0, backgroundColor: "var(--surface)", backgroundImage: url ? `url(${isVideoUrl(url) ? cldVideoPoster(url, 200) : url})` : "none", backgroundSize: "cover", backgroundPosition: "center", border: "1px solid var(--line)" });

  return (
    <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
      <h3 className="product-title" style={{ fontSize: 18, marginBottom: 6 }}>Двойные слайды</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>Показываются на главной после первых 24 товаров. 3 фото или видео (mp4/webm/mov до 50 МБ, звук убирается), квадрат 1200×1200.</p>

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          + Добавить двойной слайд
        </button>
      ) : (
        <div style={{ maxWidth: 480, marginBottom: 24, border: "1px solid var(--line)", padding: 20 }}>
          {SIDES.map(([k, name]) => (
            <div key={k} style={{ marginBottom: 14, paddingBottom: 4, borderBottom: "1px dashed var(--line)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{name} фото</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input maxLength={60} placeholder="Шар RU (например: Рубашка)" value={form[`${k}_label_ru`]} onChange={(e) => setForm({ ...form, [`${k}_label_ru`]: e.target.value })} style={inputStyle} />
                <input maxLength={60} placeholder="Шар TJ (например: Курта)" value={form[`${k}_label_tj`]} onChange={(e) => setForm({ ...form, [`${k}_label_tj`]: e.target.value })} style={inputStyle} />
              </div>
              <label style={{ display: "block", marginBottom: 10, fontSize: 13, color: "var(--text-muted)" }}>
                Фото или видео{editingId ? " (пусто = не менять)" : ""}
                <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={(e) => setFiles({ ...files, [k]: e.target.files?.[0] ?? null })} style={{ display: "block", marginTop: 6 }} />
              </label>
            </div>
          ))}
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
            <div style={thumb(s.center_image_url)} />
            <div style={thumb(s.right_image_url)} />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
              <span className="product-title" style={{ fontSize: 17 }}>
                {(s.left_label_ru || s.button_text || "—")} / {(s.center_label_ru || "—")} / {(s.right_label_ru || s.title || "—")}
              </span>
              <div style={{ display: "flex", gap: 12 }}>
                <span onClick={() => startEdit(s)} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12, textDecoration: "underline" }}>Изменить</span>
                <span onClick={() => toggle(s)} style={{ cursor: "pointer", color: "var(--text)", fontSize: 12, textDecoration: "underline" }}>{s.is_active ? "Выключить" : "Включить"}</span>
                <span onClick={() => remove(s.id)} style={{ cursor: "pointer", color: "#E24B4A", fontSize: 12, textDecoration: "underline" }}>Удалить</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              TJ: {s.left_label_tj || "—"} / {s.center_label_tj || "—"} / {s.right_label_tj || "—"}
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
