import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Cormorant_Garamond, Jost } from "next/font/google";

const fontDisplay = Cormorant_Garamond({ subsets: ["latin", "cyrillic", "cyrillic-ext"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-cormorant", display: "swap" });
const fontBody = Jost({ subsets: ["latin", "cyrillic"], weight: ["300", "400", "500"], variable: "--font-jost", display: "swap" });
import { CartProvider } from "./cart-context";
import { CategoriesProvider } from "./categories-context";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";
import { LangProvider } from "./lang-context";
import { CityProvider } from "./city-context";
import { ThemeSync } from "./theme-sync";
import { BottomNav } from "./bottom-nav";
import { SupportWidget } from "./support-widget";
import { BagDrawerHost } from "./bag-drawer";
import { SiteFooter } from "./site-footer";
import Script from "next/script";
import { Splash } from "./splash";
import { splashScript } from "./splash-script";

export const metadata: Metadata = {
  title: {
    default: "T.oina.tj — Интернет-магазин одежды в Таджикистане",
    template: "%s — T.oina.tj",
  },
  description: "Интернет-магазин одежды T.oina.tj в Таджикистане. Женская, мужская и детская одежда с доставкой по Душанбе и всей стране.",
  keywords: ["одежда", "магазин одежды", "Таджикистан", "Душанбе", "интернет-магазин", "Oina"],
  openGraph: {
    title: "T.oina.tj — Интернет-магазин одежды в Таджикистане",
    description: "Женская, мужская и детская одежда с доставкой по Душанбе и всей стране.",
    type: "website",
    locale: "ru_RU",
    siteName: "T.oina.tj",
  },
  manifest: "/manifest.json",
  twitter: {
    card: "summary_large_image",
    title: "T.oina.tj — Интернет-магазин одежды в Таджикистане",
    description: "Женская, мужская и детская одежда с доставкой по Душанбе и всей стране.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0e0e10",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
      </head>
      <body>
        <Splash />
        <ThemeSync />
        <ThemeProvider>
          <LangProvider>
            <CityProvider>
            <AuthProvider>
              <CartProvider>
                <CategoriesProvider>
                {children}
                <SiteFooter />
                <BottomNav />
                <SupportWidget />
                <BagDrawerHost />
                </CategoriesProvider>
              </CartProvider>
            </AuthProvider>
            </CityProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}