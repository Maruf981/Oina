import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "./cart-context";
import { AuthProvider } from "./auth-context";
import { ThemeProvider } from "./theme-context";
import { LangProvider } from "./lang-context";
import { ThemeSync } from "./theme-sync";
import { BottomNav } from "./bottom-nav";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Oina.tj",
  description: "Одежда для повседневной жизни",
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