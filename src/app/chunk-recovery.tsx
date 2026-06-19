"use client";

import { useEffect } from "react";

const reloadFlag = "autonomy.chunkReloaded";

export function ChunkRecovery() {
  useEffect(() => {
    try {
      window.sessionStorage.removeItem(reloadFlag);
    } catch {
      // Ignore sessionStorage access errors (e.g. if disabled in browser)
    }
  }, []);

  return null;
}
