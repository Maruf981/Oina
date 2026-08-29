"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCart } from "../../cart-context";
import { translations, Lang } from "../../translations";

type Variant = {
  id: number;
  size: string;
  color: string;
  stock: number;
};

type ProductImage = {
  id: number;
  url: string;
  color: string | null;
  sort_order: number;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

type ProductBrief = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string;
  price: number;
  images: { url: string }[];
};

type Product = {
  id: number;
  title_ru: string;
  title_tj: string | null;
  catalog_number: string;
  category: Category | null;
  price: number;
  material_ru: string | null;
  material_tj: string | null;
  country_of_origin_ru: string | null;
  country_of_origin_tj: string | null;
  care_instructions_ru: string | null;
  care_instructions_tj: string | null;
  description_ru: string | null;
  description_tj: string | null;
  variants: Variant[];
  images: ProductImage[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const cart = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState<ProductBrief[]>([]);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [lang, setLang] = useState<Lang>("ru");
  const t = translations[lang];

  const localized = (ru: string, tj: string | null) => (lang === "tj" && tj ? tj : ru);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
    const savedLang = localStorage.getItem("lang") as Lang | null;
    if (savedLang) setLang(savedLang);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        setProduct(data);
        if (data.variants?.length > 0) setSelectedVariant(data.variants[0].id);
        if (data.category_id) {
        fetch(`${API_URL}/products/?category_id=${data.category_id}`)
            .then((res) => res.json())
            .then((all: ProductBrief[]) => setRelated(all.filter((p) => p.id !== data.id).slice(0, 4)));
        }
      });
  }, [params.id]);

  if (!product) {
    return (
      <div data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh", padding: 40 }}>
        Загрузка...
      </div>
    );
  }

  const handleAddToCart = () => {
    const variant = product.variants.find((v) => v.id === selectedVariant);
    if (!variant) return;
    cart.addItem({
      variantId: variant.id,
      productId: product.id,
      title: localized(product.title_ru, product.title_tj),
      catalogNumber: product.catalog_number,
      price: product.price,
      size: variant.size,
      color: variant.color,
    });
  };

  return (
    <div
      data-theme={theme}
      style={{ background: "var(--bg)", color: "var(--text)", minHeight: "100vh" }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-label)", fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
          <span onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
            Главная
          </span>
          {product.category && (
            <>
              <span>/</span>
              <span onClick={() => router.push("/")} style={{ cursor: "pointer" }}>
                {product.category.name}
              </span>
            </>
          )}
          <span>/</span>
          <span style={{ color: "var(--text)" }}>{localized(product.title_ru, product.title_tj)}</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, marginTop: 30 }}>
          <div>
            <div
              style={{
                aspectRatio: "3/4",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                marginBottom: 10,
                backgroundImage: product.images[activeImage]
                  ? `url(${product.images[activeImage].url})`
                  : "none",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            {product.images.length > 1 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.images.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImage(idx)}
                    style={{
                      width: 60,
                      height: 60,
                      backgroundImage: `url(${img.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      border: idx === activeImage ? "2px solid var(--accent)" : "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="catalog-label" style={{ border: "none", padding: 0, marginBottom: 16 }}>
              Кат. № {product.catalog_number}
            </div>
            <h1 className="product-title" style={{ fontSize: 32, marginBottom: 12 }}>
              {localized(product.title_ru, product.title_tj)}
            </h1>
            <div className="price" style={{ fontSize: 22, marginBottom: 24 }}>
              {product.price} смн
            </div>

            {(product.description_ru || product.description_tj) && (
              <p style={{ color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
                {localized(product.description_ru ?? "", product.description_tj)}
              </p>
            )}
            {product.variants.length > 0 && (
              <>
                <select
                  value={selectedVariant ?? ""}
                  onChange={(e) => setSelectedVariant(Number(e.target.value))}
                  style={{
                    width: "100%",
                    marginBottom: 8,
                    padding: "10px",
                    background: "var(--surface)",
                    color: "var(--text)",
                    border: "1px solid var(--line)",
                    fontFamily: "var(--font-label)",
                    fontSize: 13,
                  }}
                >
                  {product.variants.map((v) => (
                    <option key={v.id} value={v.id} disabled={v.stock === 0}>
                      {v.size} / {v.color} {v.stock === 0 ? "— нет в наличии" : ""}
                    </option>
                  ))}
                </select>
                <span
                  onClick={() => setSizeGuideOpen(true)}
                  style={{
                    display: "block",
                    cursor: "pointer",
                    fontFamily: "var(--font-label)",
                    fontSize: 12,
                    color: "var(--accent)",
                    marginBottom: 16,
                  }}
                >
                  Гид по размерам
                </span>
              </>
            )}

            <button
              onClick={handleAddToCart}
              style={{
                width: "100%",
                padding: "16px",
                background: "var(--text)",
                color: "var(--bg)",
                border: "none",
                fontFamily: "var(--font-label)",
                fontSize: 13,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                cursor: "pointer",
                marginBottom: 32,
              }}
            >
              Добавить в корзину
            </button>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 20 }}>
              {(product.material_ru || product.material_tj) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="catalog-label" style={{ border: "none", padding: 0 }}>
                    {lang === "ru" ? "Материал" : "Матоъ"}
                  </span>
                  <span style={{ fontSize: 14 }}>{localized(product.material_ru ?? "", product.material_tj)}</span>
                </div>
              )}
              {(product.country_of_origin_ru || product.country_of_origin_tj) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                  <span className="catalog-label" style={{ border: "none", padding: 0 }}>
                    {lang === "ru" ? "Производство" : "Истеҳсол"}
                  </span>
                  <span style={{ fontSize: 14 }}>{localized(product.country_of_origin_ru ?? "", product.country_of_origin_tj)}</span>
                </div>
              )}
              {(product.care_instructions_ru || product.care_instructions_tj) && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                  <span className="catalog-label" style={{ border: "none", padding: 0 }}>
                    {lang === "ru" ? "Уход" : "Нигоҳубин"}
                  </span>
                  <span style={{ fontSize: 14, textAlign: "right", maxWidth: "60%" }}>
                    {localized(product.care_instructions_ru ?? "", product.care_instructions_tj)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div style={{ marginTop: 60, borderTop: "1px solid var(--line)", paddingTop: 40 }}>
            <h2 className="product-title" style={{ fontSize: 22, marginBottom: 24 }}>
              Похожие товары
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 20 }}>
              {related.map((p) => (
                <div
                  key={p.id}
                  onClick={() => router.push(`/product/${p.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    style={{
                      aspectRatio: "3/4",
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      marginBottom: 10,
                      backgroundImage: p.images[0] ? `url(${p.images[0].url})` : "none",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="product-title" style={{ fontSize: 14, marginBottom: 4 }}>
                    {localized(p.title_ru, p.title_tj)}
                  </div>
                  <div className="price" style={{ fontSize: 13 }}>
                    {p.price} смн
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {sizeGuideOpen && (
        <div
          onClick={() => setSizeGuideOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--line)",
              padding: 32,
              width: 360,
              maxWidth: "90vw",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span className="product-title" style={{ fontSize: 18 }}>Гид по размерам</span>
              <span onClick={() => setSizeGuideOpen(false)} style={{ cursor: "pointer", fontSize: 20 }}>×</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--line)" }}>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Размер</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Грудь, см</th>
                  <th style={{ textAlign: "left", padding: "8px 0", color: "var(--text-muted)", fontFamily: "var(--font-label)" }}>Талия, см</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["S", "88-92", "72-76"],
                  ["M", "92-96", "76-80"],
                  ["L", "96-100", "80-84"],
                  ["XL", "100-104", "84-88"],
                ].map(([size, chest, waist]) => (
                  <tr key={size} style={{ borderBottom: "1px solid var(--line)" }}>
                    <td style={{ padding: "8px 0" }}>{size}</td>
                    <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>{chest}</td>
                    <td style={{ padding: "8px 0", color: "var(--text-muted)" }}>{waist}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 16 }}>
              Значения примерные, могут отличаться в зависимости от модели.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}