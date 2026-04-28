import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "光影画廊",
  description: "私人照片画廊"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="dark">
      <body className="bg-black text-[#e5e5e5] antialiased min-h-screen">{children}</body>
    </html>
  );
}
