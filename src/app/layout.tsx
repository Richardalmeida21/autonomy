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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  const reloadFlag = "autonomy.chunkReloaded";
  if (typeof window === "undefined") return;
  function handleChunkError(message) {
    if (!/ChunkLoadError|Loading chunk \\d+ failed|failed to fetch dynamically imported module/i.test(message)) return;
    if (sessionStorage.getItem(reloadFlag) === "1") return;
    sessionStorage.setItem(reloadFlag, "1");
    location.reload();
  }
  window.addEventListener("error", (e) => handleChunkError(e.message || ""));
  window.addEventListener("unhandledrejection", (e) => {
    const err = e.reason;
    if (err && typeof err === "object" && err !== null && "message" in err) {
      handleChunkError(String(err.message));
    }
  });
})();`
          }}
        />
      </head>
      <body>
        <ChunkRecovery />
        {children}
      </body>
    </html>
  );
}
