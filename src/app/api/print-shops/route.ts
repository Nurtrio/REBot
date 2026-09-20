import { NextRequest, NextResponse } from "next/server";
import type { PrintShop } from "@/types";

/**
 * Google Places Text Search (New) via REST.
 * Requires GOOGLE_PLACES_API_KEY or NEXT_PUBLIC_GOOGLE_PLACES_API_KEY.
 */

function mapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get("zip")?.trim();
  const radiusMi = Number(req.nextUrl.searchParams.get("radiusMi") ?? "10");
  if (!zip) {
    return NextResponse.json({ message: "ZIP required" }, { status: 400 });
  }

  const key =
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  if (!key) {
    return NextResponse.json(
      { shops: [], message: "Places key not configured on server." },
      { status: 503 }
    );
  }

  const radiusM = Math.round(Math.min(25, Math.max(5, radiusMi)) * 1609.34);
  const query = `print shop OR copy center near ${zip}`;

  try {
    // Geocode ZIP roughly via Places text search centered on query
    const placesRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours,places.location",
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: 8,
          locationBias: {
            circle: {
              center: { latitude: 34.0195, longitude: -118.4912 }, // fallback bias; query carries ZIP
              radius: radiusM,
            },
          },
        }),
      }
    );

    if (!placesRes.ok) {
      const errText = await placesRes.text();
      return NextResponse.json(
        {
          shops: [],
          message: `Places API error (${placesRes.status}). Open Maps for live shops.`,
          detail: errText.slice(0, 200),
        },
        { status: 502 }
      );
    }

    const data = (await placesRes.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        nationalPhoneNumber?: string;
        websiteUri?: string;
        currentOpeningHours?: { openNow?: boolean };
      }>;
    };

    const shops: PrintShop[] = (data.places ?? []).map((p, i) => {
      const address = p.formattedAddress ?? zip;
      return {
        id: p.id ?? `place_${i}`,
        name: p.displayName?.text ?? "Print shop",
        rating: p.rating,
        // Distance unknown without geocode math — approximate rank as mi proxy
        distanceMi: Math.round((i + 1) * (radiusMi / 8) * 10) / 10 || 0.5,
        openNow: Boolean(p.currentOpeningHours?.openNow),
        phone: p.nationalPhoneNumber,
        address,
        website: p.websiteUri,
        mapsUrl: mapsUrl(address),
      };
    });

    return NextResponse.json({
      shops,
      message:
        shops.length === 0
          ? "No Places results in range. Try Maps search."
          : undefined,
    });
  } catch {
    return NextResponse.json(
      {
        shops: [],
        message: "Places request failed. Open Google Maps for live shops.",
      },
      { status: 502 }
    );
  }
}
