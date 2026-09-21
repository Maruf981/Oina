import type { Metadata } from "next";
import ProductDetailClient from "./product-detail";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/products/${id}`, { cache: "no-store" });
    if (!res.ok) {
      return { title: "Товар не найден — T.oina.tj" };
    }
    const product = await res.json();
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

export default function ProductPage() {
  return <ProductDetailClient />;
}
