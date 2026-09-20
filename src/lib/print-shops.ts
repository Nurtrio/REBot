/**
 * Print shop finder — Places API when key present; demo fixtures + Maps fallback otherwise.
 * Never invent business names when key is missing for a live ZIP search —
 * DEMO fixtures are explicitly labeled and only used in MVP without a key.
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

export async function findPrintShops(
  zip: string,
  radiusMi: 5 | 10 | 25 = 10
): Promise<PrintSearchResult> {
  const mapsFallbackUrl = mapsSearchUrl(zip);
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!key) {
    // MVP: labeled demo fixtures so UI is reviewable; production shows Maps fallback only.
    const filtered = DEMO_PRINT_SHOPS.filter((s) => s.distanceMi <= radiusMi).sort(
      (a, b) => {
        if (a.openNow !== b.openNow) return a.openNow ? -1 : 1;
        if (a.distanceMi !== b.distanceMi) return a.distanceMi - b.distanceMi;
        return (b.rating ?? 0) - (a.rating ?? 0);
      }
    );
    return {
      shops: filtered,
      source: "demo",
      mapsFallbackUrl,
      message:
        "Demo shops (Places key not set). Use Maps search for live results — we never invent shops.",
    };
  }

  // Live Places wiring TODO — return empty + fallback until connected
  return {
    shops: [],
    source: "fallback",
    mapsFallbackUrl,
    message: "Places search not wired yet. Open Google Maps for live shops.",
  };
}
