"use client";

import { useEffect, useState } from "react";

/**
 * Gate client-only Zustand/localStorage UI so SSR HTML matches the first
 * client paint. Without this, createListing → /listings/[id]/shoot hydrates
 * "Listing not found" (server) against the full shoot UI (client) and React
 * #418 crashes production (iOS Safari / Chrome).
 */
export function useClientReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);
  return ready;
}
