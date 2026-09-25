// Структурированные данные schema.org для поисковиков (Google, Яндекс). На странице не видны.

export const SITE_URL = "https://t.oina.tj";

export function JsonLd({ data }: { data: object }) {
  // "<" экранируем, чтобы текст из данных (описание товара) не мог закрыть тег script
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const storeJsonLd = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  name: "T.oina.tj",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  email: "oina.tj.official@gmail.com",
  address: { "@type": "PostalAddress", addressLocality: "Dushanbe", addressCountry: "TJ" },
  sameAs: ["https://www.instagram.com/t.oina.tj/", "https://www.tiktok.com/@oina.tj", "https://t.me/oina_channel_tj"],
};

type ProductForLd = {
  id: number;
  title_ru: string;
  description_ru?: string | null;
  catalog_number?: string | null;
  price: number;
  current_price?: number;
  images?: { url: string; media_type?: string }[];
  variants?: { stock: number }[];
  category?: { name: string } | null;
  avg_rating?: number | null;
  review_count?: number;
};

export function productJsonLd(p: ProductForLd) {
  const url = `${SITE_URL}/product/${p.id}`;
  const images = (p.images ?? []).filter((i) => i.media_type !== "video").map((i) => i.url).slice(0, 5);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title_ru,
    description: p.description_ru || undefined,
    sku: p.catalog_number || undefined,
    image: images.length ? images : undefined,
    category: p.category?.name,
    url,
    offers: {
      "@type": "Offer",
      url,
      price: p.current_price || p.price,
      priceCurrency: "TJS",
      itemCondition: "https://schema.org/NewCondition",
      availability: (p.variants ?? []).some((v) => v.stock > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "T.oina.tj" },
    },
    // рейтинг только если есть реальные отзывы — иначе Google считает разметку недостоверной
    aggregateRating:
      p.review_count && p.avg_rating
        ? { "@type": "AggregateRating", ratingValue: Math.round(p.avg_rating * 10) / 10, reviewCount: p.review_count }
        : undefined,
  };
}
