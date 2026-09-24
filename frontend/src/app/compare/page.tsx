"use client";
import { Suspense, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cld } from "../../lib/cld";
import { SiteHeader } from "../site-header";
import { useTheme } from "../theme-context";
import { useLang } from "../lang-context";
import "../hero.css";
import "../cart/cart.css";
import "./compare.css";

type SizeRow = { size: string; chest: string | null; waist: string | null; garment_length: string | null; sleeve_length: string | null; shoulder_width: string | null };
type Product = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string | null;
  price: number;
  current_price: number;
  discount_active: boolean;
  avg_rating: number | null;
  review_count: number;
  fit_ru: string | null; fit_tj: string | null;
  style_ru: string | null; style_tj: string | null;
  material_ru: string | null; material_tj: string | null;
  season_ru: string | null; season_tj: string | null;
  pattern_ru: string | null; pattern_tj: string | null;
  country_of_origin_ru: string | null; country_of_origin_tj: string | null;
  images: { url: string; media_type?: string }[];
  variants: { id: number; size: string; color: string; stock: number }[];
  size_guide: SizeRow[] | null;
};
type Row = { label: string; get: (p: Product) => string };

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const isVid = (img: { url: string; media_type?: string }) => img.media_type === "video" || /\/video\/upload\/|\.(mp4|webm|mov)(\?|$)/i.test(img.url);
const uniq = (arr: string[]) => Array.from(new Set(arr));

function CompareInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { theme } = useTheme();
  const { lang } = useLang();
  const tr = (ru: string, tj: string) => (lang === "ru" ? ru : tj);
  const loc = (ru: string | null, tj: string | null) => (lang === "tj" && tj ? tj : ru) || "—";

  const idsKey = sp.get("ids") || "";
  const ids = useMemo(
    () => uniq(idsKey.split(",")).map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 3),
    [idsKey]
  );
  const [items, setItems] = useState<Product[] | null>(null);
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [size, setSize] = useState("");

  useEffect(() => {
    let alive = true;
    setItems(null);
    Promise.all(ids.map((id) => fetch(`${API_URL}/products/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)))
      .then((list) => { if (alive) setItems(list.filter(Boolean) as Product[]); });
    return () => { alive = false; };
  }, [ids]);

  const sizes = useMemo(() => {
    const s: string[] = [];
    (items || []).forEach((p) => (p.size_guide || []).forEach((r) => { if (!s.includes(r.size)) s.push(r.size); }));
    return s;
  }, [items]);
  useEffect(() => { if (sizes.length && !sizes.includes(size)) setSize(sizes[0]); }, [sizes, size]);

  const remove = (id: number) => router.replace(`/compare?ids=${ids.filter((x) => x !== id).join(",")}`);

  const rows: Row[] = [
    { label: tr("Цена", "Нарх"), get: (p) => `${p.current_price} смн` },
    { label: tr("Рейтинг", "Рейтинг"), get: (p) => (p.avg_rating ? `${Number(p.avg_rating).toFixed(1)} · ${p.review_count}` : "—") },
    { label: tr("Фасон", "Фасон"), get: (p) => loc(p.fit_ru, p.fit_tj) },
    { label: tr("Стиль", "Услуб"), get: (p) => loc(p.style_ru, p.style_tj) },
    { label: tr("Материал", "Матоъ"), get: (p) => loc(p.material_ru, p.material_tj) },
    { label: tr("Сезон", "Мавсим"), get: (p) => loc(p.season_ru, p.season_tj) },
    { label: tr("Рисунок", "Акс"), get: (p) => loc(p.pattern_ru, p.pattern_tj) },
    { label: tr("Производство", "Истеҳсол"), get: (p) => loc(p.country_of_origin_ru, p.country_of_origin_tj) },
    { label: tr("Цвета", "Рангҳо"), get: (p) => uniq(p.variants.filter((v) => v.stock > 0).map((v) => v.color)).join(", ") || "—" },
    { label: tr("Размеры в наличии", "Андозаҳои мавҷуд"), get: (p) => uniq(p.variants.filter((v) => v.stock > 0).map((v) => v.size)).join(" ") || tr("Нет в наличии", "Мавҷуд нест") },
  ];
  const guide = (k: keyof Omit<SizeRow, "size">): Row["get"] => (p) => p.size_guide?.find((r) => r.size === size)?.[k] || "—";
  const guideRows: Row[] = [
    { label: tr("Грудь", "Сина"), get: guide("chest") },
    { label: tr("Талия", "Миён"), get: guide("waist") },
    { label: tr("Длина", "Дарозӣ"), get: guide("garment_length") },
    { label: tr("Рукав", "Остин"), get: guide("sleeve_length") },
    { label: tr("Плечи", "Китф"), get: guide("shoulder_width") },
  ];

  const renderRows = (list: Row[]) =>
    list.map((row) => {
      const vals = (items || []).map(row.get);
      const diff = new Set(vals).size > 1;
      if (onlyDiff && !diff) return null;
      return (
        <div key={row.label} className="cp-row">
          <div className="cp-cell cp-label">{row.label}</div>
          {vals.map((v, i) => <div key={i} className={`cp-cell${diff ? " cp-diff" : ""}`}>{v}</div>)}
        </div>
      );
    });

  const n = items?.length || 0;

  return (
    <div className="cp-root">
      <SiteHeader />
      <div className="cp">
        <nav className="cp-crumbs">
          <span onClick={() => router.push("/")}>{tr("Главная", "Асосӣ")}</span>
          <i>/</i>
          <span onClick={() => router.push("/favorites")}>{tr("Избранное", "Интихобҳо")}</span>
          <i>/</i>
          {tr("Сравнение", "Муқоиса")}
        </nav>
        <div className="sec-head cp-head">
          <span className="coll-rule" />
          
          <h1 className="sec-title cp-title">{tr("Сравнение", "Муқоиса")}</h1>
        </div>

        {items === null ? (
          <p className="cp-note">{tr("Загрузка…", "Бор шуда истодааст…")}</p>
        ) : n < 2 ? (
          <div className="ck-empty">
            <p className="cp-note">{tr("Для сравнения нужно минимум 2 вещи.", "Барои муқоиса ақаллан 2 чиз лозим аст.")}</p>
            <button className="ck-btn ck-btn--outline" onClick={() => router.push("/favorites")}>{tr("В избранное", "Ба интихобҳо")}</button>
          </div>
        ) : (
          <>
            <div className="cp-tools">
              <button type="button" className={`cp-btn${onlyDiff ? " is-on" : ""}`} onClick={() => setOnlyDiff((v) => !v)}>
                {tr("Только отличия", "Танҳо фарқиятҳо")}
              </button>
              <button type="button" className="cp-btn" onClick={() => router.push("/favorites")}>
                {tr("Изменить выбор", "Интихобро иваз кардан")}
              </button>
            </div>

            <div className="cp-scroll">
              <div className="cp-grid" style={{ "--n": n } as CSSProperties}>
                <div className="cp-cell cp-label cp-label--empty cp-head-cell" />
                {items.map((p) => {
                  const photo = p.images.find((img) => !isVid(img));
                  const title = lang === "tj" && p.title_tj ? p.title_tj : p.title_ru;
                  return (
                    <div key={p.id} className="cp-cell cp-head-cell">
                      <button type="button" className="cp-x" aria-label={tr("Убрать", "Нест кардан")} onClick={() => remove(p.id)}>×</button>
                      <div className="cp-img" onClick={() => router.push(`/product/${p.id}`)}>
                        {photo && <img src={cld(photo.url, 600)} alt={title} loading="lazy" />}
                      </div>
                      {p.catalog_number && <div className="cp-eyebrow">{tr("Арт.", "Арт.")} {p.catalog_number}</div>}
                      <div className="cp-name">{title}</div>
                      <div className="cp-price">
                        {p.current_price} смн
                        {p.discount_active && <s>{p.price} смн</s>}
                      </div>
                    </div>
                  );
                })}

                {renderRows(rows)}

                {sizes.length > 0 && (
                  <>
                    <div className="cp-sec">
                      <span>{tr("Замеры, см", "Андозагирӣ, см")}</span>
                      <div className="cp-sizes">
                        {sizes.map((s) => (
                          <button key={s} type="button" className={`cp-size${s === size ? " is-active" : ""}`} onClick={() => setSize(s)}>{s}</button>
                        ))}
                      </div>
                    </div>
                    {renderRows(guideRows)}
                  </>
                )}

                <div className="cp-cell cp-label cp-label--empty" />
                {items.map((p) => (
                  <div key={p.id} className="cp-cell cp-foot-cell">
                    <button type="button" className="cp-btn cp-btn--full" onClick={() => router.push(`/product/${p.id}`)}>
                      {tr("Выбрать размер", "Андоза интихоб кунед")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={null}>
      <CompareInner />
    </Suspense>
  );
}
