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

  function triggerReload() {
    let shouldReload = true;
    try {
      const now = Date.now();
      const lastReload = sessionStorage.getItem(reloadFlag);
      if (lastReload && (now - parseInt(lastReload, 10) < 10000)) {
        shouldReload = false;
      } else {
        sessionStorage.setItem(reloadFlag, String(now));
      }
    } catch (e) {
      if (window.name === "autonomy_reloaded") {
        shouldReload = false;
      } else {
        window.name = "autonomy_reloaded";
      }
    }
    if (shouldReload) {
      try {
        const url = new URL(location.href);
        url.searchParams.set("cb", String(Date.now()));
        location.replace(url.toString());
      } catch (err) {
        location.reload();
      }
    }
  }

  function handleChunkError(message) {
    if (/ChunkLoadError|Loading chunk \\d+ failed|failed to fetch dynamically imported module/i.test(message)) {
      triggerReload();
    }
  }

  window.addEventListener("error", (e) => {
    if (e.message) {
      handleChunkError(e.message);
    } else if (e.target && e.target.tagName === "SCRIPT" && e.target.src && e.target.src.indexOf("/_next/static/") !== -1) {
      triggerReload();
    }
  }, true);

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
