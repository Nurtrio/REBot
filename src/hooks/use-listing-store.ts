"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";

/** Stable listing lookup (same object ref from the store). */
export function useListing(listingId: string) {
  return useAppStore((s) => s.listings.find((l) => l.id === listingId));
}

/**
 * Photos for a listing. Must NOT use getPhotos() inside the Zustand selector —
 * filter() returns a new array every call and trips React useSyncExternalStore
 * into an infinite loop (Maximum update depth / production Application error).
 */
export function useListingPhotos(listingId: string) {
  const photos = useAppStore((s) => s.photos);
  return useMemo(
    () => photos.filter((p) => p.listingId === listingId),
    [photos, listingId]
  );
}
