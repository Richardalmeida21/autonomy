"use client";

import { useEffect } from "react";

const reloadFlag = "autonomy.chunkReloaded";

export function ChunkRecovery() {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(reloadFlag);
      if (window.name === "autonomy_reloaded") {
        window.name = "";
      }

      // Clean up cache buster parameter from URL if present
      const url = new URL(window.location.href);
      if (url.searchParams.has("cb")) {
        url.searchParams.delete("cb");
        const cleanUrl = url.pathname + url.search + url.hash;
        window.history.replaceState({}, "", cleanUrl);
      }
    } catch {
      // Ignore sessionStorage access errors (e.g. if disabled in browser)
    }
  }, []);

  return null;
}
