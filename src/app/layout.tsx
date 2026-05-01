import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "光影画廊",
  description: "私人照片画廊",
  icons: {
    icon: "/brand/gallery_logo.png",
    shortcut: "/brand/gallery_logo.png",
    apple: "/brand/gallery_logo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh" className="dark" data-theme="dark">
      <body className="min-h-screen bg-[color:var(--page-bg)] text-[color:var(--text-primary)] antialiased">{children}</body>
    </html>
  );
}
