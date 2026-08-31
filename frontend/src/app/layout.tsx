import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "./cart-context";
import { AuthProvider } from "./auth-context";
import { ThemeSync } from "./theme-sync";
import { BottomNav } from "./bottom-nav";

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
    <html lang="ru">
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>
        <ThemeSync />
        <AuthProvider>
          <CartProvider>
            {children}
            <BottomNav />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}