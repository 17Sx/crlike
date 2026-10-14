import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRLike | Prototype",
  description:
    "Un jeu de stratégie en temps réel sur le web. Prototype en développement.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="font-sans">
      <body>{children}</body>
    </html>
  );
}
