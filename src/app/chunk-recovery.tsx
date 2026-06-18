"use client";

import { useEffect } from "react";

const reloadFlag = "autonomy.chunkReloaded";

function isChunkLoadError(value: unknown) {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : value && typeof value === "object" && "message" in value
          ? String((value as { message?: unknown }).message || "")
          : "";

  return /ChunkLoadError|Loading chunk \d+ failed|failed to fetch dynamically imported module/i.test(
    message
  );
}

function recoverFromStaleChunk(error: unknown) {
  if (!isChunkLoadError(error)) {
    return;
  }

  if (window.sessionStorage.getItem(reloadFlag) === "1") {
    return;
  }

  window.sessionStorage.setItem(reloadFlag, "1");
  window.location.reload();
}

export function ChunkRecovery() {
  useEffect(() => {
    window.sessionStorage.removeItem(reloadFlag);

    const handleError = (event: ErrorEvent) => {
      recoverFromStaleChunk(event.error || event.message);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      recoverFromStaleChunk(event.reason);
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
