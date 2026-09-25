import type { Metadata } from "next";
import { cache } from "react";
import ProductDetailClient from "./product-detail";
import { JsonLd, productJsonLd } from "../../../lib/json-ld";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Props = {
  params: Promise<{ id: string }>;
};

// один запрос на рендер: товар нужен и для метаданных, и для разметки JSON-LD
const getProduct = cache(async (id: string) => {
  try {
    const res = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    if (!product) {
      return { title: "Товар не найден — T.oina.tj" };
    }
    const title = `${product.title_ru} — T.oina.tj`;
    const description =
      product.description_ru?.slice(0, 160) ||
      `Купить ${product.title_ru} в интернет-магазине T.oina.tj. Артикул ${product.catalog_number}. Цена ${product.current_price ?? product.price} смн.`;
    const imageUrl = product.images?.[0]?.url;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: imageUrl ? [{ url: imageUrl }] : undefined,
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : undefined,
      },
    };
  } catch {
    return { title: "T.oina.tj" };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  return (
    <>
      {product && <JsonLd data={productJsonLd(product)} />}
      <ProductDetailClient />
    </>
  );
}
