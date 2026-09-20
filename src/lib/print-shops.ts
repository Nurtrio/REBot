/**
 * Print shop finder — Places API when key present; labeled demo + Maps fallback otherwise.
 * Never invent business names for a live ZIP search.
 */

import { DEMO_PRINT_SHOPS } from "@/data/seed";
import type { PrintShop } from "@/types";

export interface PrintSearchResult {
  shops: PrintShop[];
  source: "places" | "demo" | "fallback";
  mapsFallbackUrl: string;
  message?: string;
}

export function mapsSearchUrl(zip: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `print shop near ${zip}`
  )}`;
}

function sortShops(shops: PrintShop[]): PrintShop[] {
  return [...shops].sort((a, b) => {
    if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
    if (a.distanceMi !== b.distanceMi) return a.distanceMi - b.distanceMi;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

/** Client entry: hit our API when a Places key exists; else labeled demo fixtures. */
export async function findPrintShops(
  zip: string,
  radiusMi: 5 | 10 | 25 = 10
): Promise<PrintSearchResult> {
  const mapsFallbackUrl = mapsSearchUrl(zip);
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!key) {
    const filtered = sortShops(
      DEMO_PRINT_SHOPS.filter((s) => s.distanceMi <= radiusMi)
    );
    return {
      shops: filtered,
      source: "demo",
      mapsFallbackUrl,
      message:
        "Demo shops (Places key not set). Use Maps search for live results — we never invent shops.",
    };
  }

  try {
    const res = await fetch(
      `/api/print-shops?zip=${encodeURIComponent(zip)}&radiusMi=${radiusMi}`
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        shops: [],
        source: "fallback",
        mapsFallbackUrl,
        message:
          (body as { message?: string }).message ??
          "Places search failed. Open Google Maps for live shops.",
      };
    }
    const data = (await res.json()) as {
      shops: PrintShop[];
      message?: string;
    };
    return {
      shops: sortShops(data.shops ?? []),
      source: "places",
      mapsFallbackUrl,
      message: data.message,
    };
  } catch {
    return {
      shops: [],
      source: "fallback",
      mapsFallbackUrl,
      message: "Places search unavailable. Open Google Maps for live shops.",
    };
  }
}
