"use client";

import "../hero.css";
import "../cart/cart.css";
import "./account.css";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth-context";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type OrderItem = {
  id: number;
  product_variant_id: number;
  quantity: number;
  price_at_order: number;
  variant: {
    id: number;
    size: string;
    color: string;
    title_ru: string;
    title_tj: string | null;
    catalog_number: string;
  } | null;
};

type Order = {
  id: number;
  status: string;
  payment_method: string | null;
  delivery_address: string | null;
  comment: string | null;
  total: number;
  created_at: string;
  items: OrderItem[];
};

const statusLabelsRu: Record<string, string> = {
  new: "Новый",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  confirmed: "Подтверждён",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
  returned: "Возврат",
};
const statusLabelsTj: Record<string, string> = {
  new: "Нав",
  awaiting_payment: "Дар интизори пардохт",
  paid: "Пардохтшуда",
  confirmed: "Тасдиқшуда",
  shipped: "Фиристодашуда",
  delivered: "Расонидашуда",
  cancelled: "Бекоршуда",
  returned: "Баргардонида шуд",
};

type Tab = "profile" | "orders" | "password";

export default function AccountPage() {
  const auth = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const { lang } = useLang();
  const [tab, setTab] = useState<Tab>("profile");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [showAllOrders, setShowAllOrders] = useState(false);


  useEffect(() => {
    if (auth.initialized && !auth.token) {
      router.push("/");
      return;
    }
  }, [auth.token, auth.initialized]);

  useEffect(() => {
    if (auth.customer) {
      setName(auth.customer.name || "");
      setPhone(auth.customer.phone || "");
      setAddress(auth.customer.address || "");
    }
  }, [auth.customer]);

  useEffect(() => {
    if (!auth.token) return;
    fetch(`${API_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((res) => res.json())
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [auth.token]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.token) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/upload/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      if (res.ok) await auth.refreshMe();
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!auth.token) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ name, phone, address }),
      });
      if (res.ok) {
        await auth.refreshMe();
        setProfileMsg("Сохранено");
        setEditingProfile(false);
      } else {
        const data = await res.json().catch(() => null);
        setProfileMsg(data?.detail || "Ошибка сохранения");
      }
    } catch {
      setProfileMsg("Ошибка сети");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!auth.token) return;
    setSavingPassword(true);
    setPasswordMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      if (res.ok) {
        setPasswordMsg("Пароль изменён");
        setOldPassword("");
        setNewPassword("");
      } else {
        const data = await res.json().catch(() => null);
        setPasswordMsg(data?.detail || "Ошибка смены пароля");
      }
    } catch {
      setPasswordMsg("Ошибка сети");
    } finally {
      setSavingPassword(false);
    }
  };
  const handleDeleteAccount = async () => {
    if (!auth.token) return;
    setDeletingAccount(true);
    setDeleteMsg("");
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (res.ok) {
        auth.logout();
        router.push("/");
      } else {
        const data = await res.json().catch(() => null);
        setDeleteMsg(data?.detail || "Ошибка удаления аккаунта");
      }
    } catch {
      setDeleteMsg("Ошибка сети");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!auth.customer) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: tr("Данные", "Маълумот") },
    { key: "orders", label: `${tr("Заказы", "Фармоишҳо")} (${orders.length})` },
    { key: "password", label: tr("Пароль", "Парол") },
  ];

  return (
    <div data-theme={theme} className="ac-root">
      <SiteHeader />
      <div className="ac">
        <div className="ac-head">
          <span className="coll-rule" />
          <div className="ck-eyebrow">{tr("Личный кабинет", "Утоқи шахсӣ")}</div>

          <label className={`ac-avatar${uploadingAvatar ? " is-loading" : ""}`}>
            <span
              className="ac-avatar-img"
              style={{ backgroundImage: auth.customer.avatar_url ? `url(${auth.customer.avatar_url})` : "none" }}
            >
              {!auth.customer.avatar_url && (auth.customer.name || "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="ac-avatar-edit">{uploadingAvatar ? "…" : tr("Изменить фото", "Иваз кардани акс")}</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} />
          </label>

          <h1 className="ac-title">{auth.customer.name || tr("Без имени", "Бе ном")}</h1>
          <div className="ac-phone">{auth.customer.phone}</div>

          <nav className="ac-tabs">
            {tabs.map((tItem) => (
              <span key={tItem.key} className={`coll-item${tab === tItem.key ? " is-active" : ""}`} onClick={() => setTab(tItem.key)}>
                {tItem.label}
              </span>
            ))}
          </nav>
        </div>

        {tab === "profile" && (
          <div className="ac-panel">
            <div className="ck-label">{tr("Личные данные", "Маълумоти шахсӣ")}</div>
            <label className="ck-field">
              <span className="ck-field-label">{tr("Имя", "Ном")}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={!editingProfile} />
            </label>
            <label className="ck-field">
              <span className="ck-field-label">{tr("Телефон", "Телефон")}</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!editingProfile} />
            </label>
            <label className="ck-field">
              <span className="ck-field-label">{tr("Адрес доставки", "Суроғаи расонидани мол")}</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!editingProfile} />
            </label>
            {editingProfile ? (
              <div className="ac-actions">
                <button className="ck-btn" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? tr("Сохраняем...", "Сабт мешавад...") : tr("Сохранить", "Сабт")}
                </button>
                <span className="ck-link ck-link--muted" onClick={() => {
                  setEditingProfile(false);
                  setName(auth.customer?.name || "");
                  setPhone(auth.customer?.phone || "");
                  setAddress(auth.customer?.address || "");
                }}>{tr("Отмена", "Бекор")}</span>
              </div>
            ) : (
              <button className="ck-btn ck-btn--outline ac-btn-full" onClick={() => { setEditingProfile(true); setProfileMsg(""); }}>
                {tr("Изменить данные", "Таъғир додан")}
              </button>
            )}
            {profileMsg && <p className="ck-note ck-note--center">{profileMsg}</p>}
          </div>
        )}

        {tab === "orders" && (
          <div className="ac-panel ac-panel--wide">
            {orders.length === 0 ? (
              <div className="ck-empty">
                <p>{tr("У вас пока нет заказов", "Айни ҳол фармоиш мавҷуд нест")}</p>
                <button className="ck-btn ck-btn--outline" onClick={() => router.push("/")}>{tr("Перейти в каталог", "Ба каталог")}</button>
              </div>
            ) : (
              <>{(showAllOrders ? orders : orders.slice(0, 2)).map((order) => (
                <div key={order.id} className="ac-order">
                  <div className="ac-order-top">
                    <div>
                      <div className="ck-meta">
                        {new Date(order.created_at).toLocaleDateString("ru-RU")} · {order.payment_method === "card" ? tr("Карта", "Корт") : order.payment_method === "cod" ? tr("При получении", "Ҳангоми қабул") : "QR"}
                      </div>
                      <div className="ac-order-title">{tr("Заказ №", "Фармоиш №")} {order.id}</div>
                    </div>
                    <div className="ac-order-right">
                      <span className="ac-status">{(lang === "ru" ? statusLabelsRu : statusLabelsTj)[order.status] || order.status}</span>
                      <span className="ac-order-total">{order.total} смн</span>
                    </div>
                  </div>
                  {order.delivery_address && <p className="ac-order-address">{order.delivery_address}</p>}
                  {order.items.length > 0 && (
                    <div className="ac-order-items">
                      {order.items.map((item) => (
                        <div key={item.id} className="ac-order-item">
                          <span>
                            {item.variant ? (lang === "ru" ? item.variant.title_ru : item.variant.title_tj || item.variant.title_ru) : tr("Товар", "Мол")}
                            {item.variant && <em> · {item.variant.size} · {item.variant.color}</em>}
                          </span>
                          <span>{item.quantity} × {item.price_at_order} смн</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {orders.length > 2 && (
                <button className="ck-btn ck-btn--outline" style={{ marginTop: 16, width: "100%" }} onClick={() => setShowAllOrders((v) => !v)}>
                  {showAllOrders ? tr("Скрыть ▲", "Пӯшидан ▲") : tr(`Показать все заказы (${orders.length}) ▼`, `Ҳамаи фармоишҳо (${orders.length}) ▼`)}
                </button>
              )}
              </>
            )}
          </div>
        )}

        {tab === "password" && (
          <div className="ac-panel">
            <div className="ck-label">{tr("Смена пароля", "Иваз кардани парол")}</div>
            <label className="ck-field">
              <span className="ck-field-label">{tr("Текущий пароль", "Пароли ҳозира")}</span>
              <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </label>
            <label className="ck-field">
              <span className="ck-field-label">{tr("Новый пароль", "Пароли нав")}</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </label>
            <button className="ck-btn" onClick={handleChangePassword} disabled={savingPassword || !oldPassword || !newPassword}>
              {savingPassword ? tr("Сохраняем...", "Нигоҳ дошта истодааст...") : tr("Изменить пароль", "Ивази парол")}
            </button>
            {passwordMsg && <p className="ck-note ck-note--center">{passwordMsg}</p>}

            <div className="ac-danger">
              <div className="ck-label">{tr("Удаление аккаунта", "Нест кардани ҳисоб")}</div>
              <p className="ck-note">
                {tr("Удаление аккаунта необратимо. Ваши персональные данные будут стёрты, история заказов сохранится в анонимном виде.", "Нест кардани ҳисоб бебозгашт аст.")}
              </p>
              {!confirmDelete ? (
                <span className="ck-link ac-danger-link" onClick={() => setConfirmDelete(true)}>{tr("Удалить аккаунт", "Ҳисобро нест кардан")}</span>
              ) : (
                <>
                  <label className="ck-field">
                    <span className="ck-field-label">{tr("Пароль для подтверждения", "Парол барои тасдиқ")}</span>
                    <input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                  </label>
                  <div className="ac-actions">
                    <button className="ck-btn ac-btn-danger" onClick={handleDeleteAccount} disabled={deletingAccount || !deletePassword}>
                      {deletingAccount ? tr("Удаляем...", "...") : tr("Подтвердить удаление", "Тасдиқ")}
                    </button>
                    <span className="ck-link ck-link--muted" onClick={() => { setConfirmDelete(false); setDeletePassword(""); setDeleteMsg(""); }}>
                      {tr("Отмена", "Бекор")}
                    </span>
                  </div>
                  {deleteMsg && <span className="ck-error">{deleteMsg}</span>}
                </>
              )}
            </div>
          </div>
        )}

        <div className="ac-logout">
          <span className="ck-link ck-link--muted" onClick={() => { auth.logout(); router.push("/"); }}>{tr("Выйти из аккаунта", "Баромад")}</span>
        </div>
      </div>
    </div>
  );
}
