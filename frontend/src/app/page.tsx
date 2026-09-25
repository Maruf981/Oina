import type { Metadata } from "next";
import HomeClient, { type HomeInitial } from "./home-client";
import { JsonLd, storeJsonLd } from "../lib/json-ld";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
// те же ключи фильтров, что и в home-client: с ними первую порцию товаров грузит браузер
const FILTER_KEYS = [
  "search", "min_price", "max_price", "size", "color", "category_id", "category",
  "recommended_only", "sort", "material", "season", "brand_only", "in_stock_only", "on_sale_only",
];

// данные для первого экрана: кэш 60 с, таймаут 2.5 с — если API не ответил, браузер загрузит сам
async function get<T>(path: string): Promise<T | undefined> {
  try {
    const r = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(2500) });
    if (!r.ok) return undefined;
    return (await r.json()) as T;
  } catch {
    return undefined;
  }
}
const list = <T,>(d: unknown): T[] | undefined =>
  Array.isArray(d) ? (d as T[]) : d && typeof d === "object" && Array.isArray((d as { items?: unknown }).items) ? ((d as { items: T[] }).items) : undefined;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : undefined;
  if (search) {
    const title = `Поиск: ${search}`;
    const description = `Результаты поиска "${search}" в интернет-магазине T.oina.tj.`;
    return {
      title,
      description,
      openGraph: { title: `${title} — T.oina.tj`, description },
      twitter: { title: `${title} — T.oina.tj`, description },
    };
  }
  return {};
}

export default async function Home({ searchParams }: Props) {
  const params = await searchParams;
  const hasFilters = FILTER_KEYS.some((k) => params[k] !== undefined);

  const [banners, dualSlides, hits, recommended, reviews, catalog] = await Promise.all([
    get<unknown>("/banners/"),
    get<unknown>("/dual-slides/"),
    get<unknown>("/products/?sort=popularity&limit=10"),
    get<unknown>("/products/?recommended_only=true&limit=12"),
    get<unknown>("/reviews/homepage"),
    hasFilters ? Promise.resolve(undefined) : get<{ items?: unknown; total?: number }>("/products/page?offset=0&limit=20"),
  ]);

  const initial: HomeInitial = {
    banners: list(banners),
    dualSlides: list(dualSlides),
    hits: list(hits),
    recommended: list(recommended),
    reviews: list(reviews),
    catalog: catalog && Array.isArray(catalog.items) ? { items: catalog.items as never[], total: Number(catalog.total ?? 0) } : undefined,
  };

  return (
    <>
      <JsonLd data={storeJsonLd} />
      <HomeClient initial={initial} />
    </>
  );
}
