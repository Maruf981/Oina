import type { MetadataRoute } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const SITE_URL = "https://oina-frontend.onrender.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/favorites`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/faq`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/delivery`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, changeFrequency: "monthly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "monthly", priority: 0.2 },
  ];

  try {
    const res = await fetch(`${API_URL}/products/`, { cache: "no-store" });
    if (!res.ok) return staticPages;
    const products: { id: number }[] = await res.json();
    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/product/${p.id}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticPages, ...productPages];
  } catch {
    return staticPages;
  }
}
