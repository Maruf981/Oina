import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/json-ld";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/orders"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
