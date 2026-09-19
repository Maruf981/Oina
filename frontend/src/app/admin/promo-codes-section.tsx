"use client";

import { useEffect, useState } from "react";

const PERCENTS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const EMPTY = { code: "", percent: 10, starts_on: "", ends_on: "", max_uses: "", per_customer_limit: 1, min_order_total: "", is_active: true };

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "OINA";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const errText = (d: any, fallback: string) =>
  typeof d?.detail === "string"
    ? d.detail
    : Array.isArray(d?.detail)
      ? String(d.detail[0]?.msg || fallback).replace(/^Value error, /, "")
      : fallback;

const todayDushanbe = () => new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);

function statusOf(p: any) {
  const today = todayDushanbe();
  if (!p.is_active) return "Выключен";
  if (p.starts_on && p.starts_on > today) return "Ещё не начался";
  if (p.ends_on && p.ends_on < today) return "Истёк";
  if (p.max_uses != null && p.used_count >= p.max_uses) return "Лимит исчерпан";
  return "Активен";
}

export function PromoCodesSection({ api, authFetch }: any) {
  const [promos, setPromos] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = () =>
    authFetch(`${api}/promo-codes/`)
      .then((r: any) => r.json())
      .then((d: any) => setPromos(Array.isArray(d) ? d : []))
      .catch(() => setPromos([]));

  useEffect(() => { refresh(); }, []);

  const reset = () => { setForm(EMPTY); setEditingId(null); setCreating(false); setError(""); };

  const startEdit = (p: any) => {
    setForm({
      code: p.code,
      percent: p.percent,
      starts_on: p.starts_on || "",
      ends_on: p.ends_on || "",
      max_uses: p.max_uses ?? "",
      per_customer_limit: p.per_customer_limit,
      min_order_total: p.min_order_total ?? "",
      is_active: p.is_active,
    });
    setEditingId(p.id); setCreating(true); setError("");
  };

  const payload = () => ({
    percent: Number(form.percent),
    starts_on: form.starts_on || null,
    ends_on: form.ends_on || null,
    max_uses: form.max_uses === "" ? null : Number(form.max_uses),
    per_customer_limit: Number(form.per_customer_limit) || 1,
    min_order_total: form.min_order_total === "" ? null : Number(form.min_order_total),
    is_active: form.is_active,
  });

  const save = async () => {
    setError("");
    const code = String(form.code).trim().toUpperCase();
    if (!editingId && !/^[A-Z0-9]{3,32}$/.test(code)) return setError("Код: 3–32 символа, только латинские буквы и цифры");
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) return setError("Дата окончания раньше даты начала");
    setSaving(true);
    const res = await authFetch(editingId ? `${api}/promo-codes/${editingId}` : `${api}/promo-codes/`, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? payload() : { code, ...payload() }),
    });
    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) return setError(errText(data, "Не удалось сохранить"));
    reset(); refresh();
  };

  const toggle = async (p: any) => {
    await authFetch(`${api}/promo-codes/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !p.is_active }),
    });
    refresh();
  };

  const inputStyle = { width: "100%", padding: 10, marginBottom: 10, background: "var(--surface)", border: "1px solid var(--line)", color: "var(--text)", boxSizing: "border-box" as const };
  const labelStyle = { display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 };

  return (
    <div style={{ padding: "0 16px" }}>
      <h3 className="product-title" style={{ fontSize: 18, marginBottom: 6 }}>Промокоды</h3>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
        Только для авторизованных клиентов. Не суммируется со скидкой товара — действует бо́льшая. Доставка не скидывается.
      </p>

      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          style={{ marginBottom: 24, padding: "10px 20px", background: "var(--text)", color: "var(--bg)", border: "none", fontFamily: "var(--font-label)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer" }}
        >
          + Создать промокод
        </button>
      ) : (
        <div style={{ maxWidth: 480, marginBottom: 24, border: "1px solid var(--line)", padding: 20 }}>
          <label style={labelStyle}>Код</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={form.code}
              disabled={!!editingId}
              maxLength={32}
              placeholder="Например: OINA10"
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
              style={{ ...inputStyle, opacity: editingId ? 0.6 : 1 }}
            />
            {!editingId && (
              <button type="button" onClick={() => setForm({ ...form, code: randomCode() })} style={{ marginBottom: 10, padding: "0 12px", background: "transparent", color: "var(--text)", border: "1px solid var(--line)", cursor: "pointer", whiteSpace: "nowrap" }}>
                Сгенерировать
              </button>
            )}
          </div>

          <label style={labelStyle}>Скидка</label>
          <select value={form.percent} onChange={(e) => setForm({ ...form, percent: Number(e.target.value) })} style={inputStyle}>
            {PERCENTS.map((p) => <option key={p} value={p}>{p}%</option>)}
          </select>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Действует с (пусто = сразу)</label>
              <input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>по (пусто = бессрочно)</label>
              <input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Всего использований (пусто = без лимита)</label>
              <input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Раз на одного клиента</label>
              <input type="number" min={1} value={form.per_customer_limit} onChange={(e) => setForm({ ...form, per_customer_limit: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Минимальная сумма заказа, смн (пусто = любая)</label>
          <input type="number" min={0} value={form.min_order_total} onChange={(e) => setForm({ ...form, min_order_total: e.target.value })} style={inputStyle} />

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

      {promos.length === 0 && <p style={{ color: "var(--text-muted)" }}>Промокодов пока нет</p>}

      {promos.map((p) => {
        const status = statusOf(p);
        return (
          <div key={p.id} style={{ border: "1px solid var(--line)", padding: 20, marginBottom: 16, opacity: status === "Активен" ? 1 : 0.55 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
              <span className="product-title" style={{ fontSize: 17, letterSpacing: "0.06em" }}>{p.code} · −{p.percent}%</span>
              <div style={{ display: "flex", gap: 12 }}>
                <span onClick={() => startEdit(p)} style={{ cursor: "pointer", color: "var(--text-muted)", fontSize: 12, textDecoration: "underline" }}>Изменить</span>
                <span onClick={() => toggle(p)} style={{ cursor: "pointer", color: "var(--text)", fontSize: 12, textDecoration: "underline" }}>{p.is_active ? "Выключить" : "Включить"}</span>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Статус: <b style={{ color: "var(--text)" }}>{status}</b><br />
              Период: {p.starts_on || "сразу"} — {p.ends_on || "бессрочно"}<br />
              Использован: {p.used_count} / {p.max_uses ?? "∞"} · На клиента: {p.per_customer_limit}<br />
              Мин. сумма: {p.min_order_total != null ? `${p.min_order_total} смн` : "нет"}
            </div>
          </div>
        );
      })}
    </div>
  );
}
