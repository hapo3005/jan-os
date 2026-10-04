import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JAN OS",
  description: "Dein Leben. Deine Projekte. Ein System."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
