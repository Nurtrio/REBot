"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ScreenHeader, CreditPill, Button, SectionLabel } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { useClientReady } from "@/hooks/use-client-ready";
import { useListing, useListingPhotos } from "@/hooks/use-listing-store";
import { formatListingPrice } from "@/lib/credits";

const links = [
  { suffix: "shoot", label: "Shoot", desc: "Room rail, leveler, coach" },
  { suffix: "review", label: "Review roll", desc: "Flags, select for grade" },
  { suffix: "grade", label: "Grade", desc: "Natural color · credit confirm" },
  { suffix: "gallery", label: "Gallery", desc: "Curated order" },
  { suffix: "flyer", label: "Flyer", desc: "Templates → PDF" },
  { suffix: "print", label: "Print", desc: "ZIP → nearby shops" },
];

export default function ListingHubPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useListing(id);
  const ready = useClientReady();
  const photos = useListingPhotos(id);
  const balance = useAppStore((s) => s.balance());

  if (!ready) {
    return (
      <main className="px-4 py-8 text-sm text-muted">Loading…</main>
    );
  }

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Listing" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  return (
    <main>
      <ScreenHeader
        title={listing.address}
        subtitle={`${listing.city}, ${listing.state}`}
        backHref="/"
        right={<CreditPill balance={balance} />}
      />
      <div className="px-4 py-5">
        <div className="fw-card px-4 py-4">
          <p className="font-display text-2xl text-ink">
            {formatListingPrice(listing.price)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {listing.beds} bd · {listing.baths} ba ·{" "}
            {listing.sqft.toLocaleString()} sf
          </p>
          <p className="mt-3 text-xs text-faint">
            {photos.length} frames · status: {listing.status}
          </p>
        </div>

        <div className="mt-4">
          <Link href={`/listings/${id}/shoot`}>
            <Button size="lg">Continue shoot</Button>
          </Link>
        </div>

        <div className="mt-8">
          <SectionLabel>Workflow</SectionLabel>
        </div>
        <ul className="mt-2 space-y-2">
          {links.map((l) => (
            <li key={l.suffix}>
              <Link
                href={`/listings/${id}/${l.suffix}`}
                className="flex items-center justify-between rounded-fw border border-line bg-paper-raised px-4 py-3 transition hover:border-line-strong"
              >
                <div>
                  <p className="text-sm font-medium text-ink">{l.label}</p>
                  <p className="text-xs text-muted">{l.desc}</p>
                </div>
                <span className="text-faint">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
