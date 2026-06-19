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
    } else {
      // If reload was already attempted recently (e.g. firewall blocking assets), show a helpful banner
      setTimeout(() => {
        try {
          if (document.getElementById("autonomy-firewall-alert")) return;
          const container = document.createElement("div");
          container.id = "autonomy-firewall-alert";
          container.style.cssText = "position:fixed;top:0;left:0;right:0;background:#fff5f5;border-bottom:2px solid #ff4d4f;color:#c02b2b;padding:16px;text-align:center;font-family:system-ui,-apple-system,sans-serif;z-index:999999;box-shadow:0 4px 12px rgba(0,0,0,0.1);line-height:1.5;";
          container.innerHTML = "<h3 style='margin:0 0 4px;font-size:15px;font-weight:600;'>Falha ao carregar componentes do sistema</h3><p style='margin:0;font-size:13px;'>Parece que a sua rede ou firewall corporativo está bloqueando o carregamento dos scripts do Autonomy. Se estiver conectado a uma VPN ou rede de empresa, tente desativá-la ou acessar por uma rede externa (como 4G/5G) para testar.</p>";
          document.body.appendChild(container);
        } catch (e) {}
      }, 500);
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
