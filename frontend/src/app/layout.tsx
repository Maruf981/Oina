import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CartProvider } from "./cart-context";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";
import { LangProvider } from "./lang-context";
import { ThemeSync } from "./theme-sync";
import { BottomNav } from "./bottom-nav";
import Script from "next/script";

export const metadata: Metadata = {
  title: {
    default: "Oina.tj — Интернет-магазин одежды в Таджикистане",
    template: "%s — Oina.tj",
  },
  description: "Интернет-магазин одежды Oina.tj в Таджикистане. Женская, мужская и детская одежда с доставкой по Душанбе и всей стране.",
  keywords: ["одежда", "магазин одежды", "Таджикистан", "Душанбе", "интернет-магазин", "Oina"],
  openGraph: {
    title: "Oina.tj — Интернет-магазин одежды в Таджикистане",
    description: "Женская, мужская и детская одежда с доставкой по Душанбе и всей стране.",
    type: "website",
    locale: "ru_RU",
    siteName: "Oina.tj",
  },
  twitter: {
    card: "summary_large_image",
    title: "Oina.tj — Интернет-магазин одежды в Таджикистане",
    description: "Женская, мужская и детская одежда с доставкой по Душанбе и всей стране.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      </head>
      <body>
        <ThemeSync />
        <ThemeProvider>
          <LangProvider>
            <AuthProvider>
              <CartProvider>
                {children}
                <BottomNav />
              </CartProvider>
            </AuthProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}