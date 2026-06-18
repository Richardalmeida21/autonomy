import type { Metadata } from "next";
import { ChunkRecovery } from "./chunk-recovery";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autonomy",
  description: "Gerador de posts de Instagram para marcas, criadores e negocios.",
  other: {
    "facebook-domain-verification": "of8h3sujk0z0tqeke9z1n2rtk1i4kc"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <ChunkRecovery />
        {children}
      </body>
    </html>
  );
}
