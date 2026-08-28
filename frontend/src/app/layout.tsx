import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}