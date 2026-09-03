import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/orders"],
    },
    sitemap: "https://oina-frontend.onrender.com/sitemap.xml",
  };
}
