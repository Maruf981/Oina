"use client";

import { usePathname } from "next/navigation";
import { useLang } from "./lang-context";
import { Footer } from "./footer";

export function SiteFooter() {
  const pathname = usePathname();
  const { lang } = useLang();

  // на главной футер уже отрисован внутри home-client, в админке он не нужен
  if (pathname === "/" || pathname.startsWith("/admin")) return null;

  return <Footer lang={lang} />;
}
