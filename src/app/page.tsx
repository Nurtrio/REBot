"use client";

import Link from "next/link";
import { CreditPill, SectionLabel, Button } from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { formatListingPrice } from "@/lib/credits";
import { PLANS } from "@/data/plans";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  shooting: "Shooting",
  grading: "Grading",
  ready: "Gallery ready",
  marketed: "Marketed",
};

export default function HomePage() {
  const listings = useAppStore((s) => s.listings);
  const balance = useAppStore((s) => s.balance());
  const planId = useAppStore((s) => s.planId);
  const photos = useAppStore((s) => s.photos);
  const usageRatio = useAppStore((s) => s.usageRatio());
  const softUpsellDismissed = useAppStore((s) => s.softUpsellDismissed);
  const dismissSoftUpsell = useAppStore((s) => s.dismissSoftUpsell);
  const plan = PLANS.find((p) => p.id === planId)!;
  const showSoft = usageRatio >= 0.8 && !softUpsellDismissed;
  const nextName =
    planId === "starter" ? "Pro" : planId === "pro" ? "Team" : null;

  return (
    <main>
      <header className="px-4 pb-2 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">
              Framewalk
            </p>
            <h1 className="mt-1 font-display text-[1.75rem] leading-none tracking-tight text-ink">
              Listings
            </h1>
            <p className="mt-2 max-w-[16rem] text-sm text-muted">
              Guided shoot. Natural grade. Instant marketing.
            </p>
          </div>
          <CreditPill balance={balance} />
        </div>
        <p className="mt-3 text-xs text-faint">
          {plan.name} · {balance} of ~{plan.creditsMonthly}/mo
        </p>
      </header>

      <div className="px-4 pt-4">
        <Link href="/listings/new">
          <Button variant="primary" size="lg">
            New listing
          </Button>
        </Link>
      </div>

      {showSoft ? (
        <div className="mx-4 mt-4 rounded-fw border border-accent/30 bg-accent-soft px-3 py-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-ink">
                You&apos;re almost through this month&apos;s credits.
              </p>
              <p className="mt-1 text-xs text-muted">
                {nextName
                  ? `${nextName} covers more listings — one tap on Billing.`
                  : "Top up from Billing to finish this listing."}
              </p>
              <Link
                href="/billing"
                className="mt-2 inline-block text-xs font-medium text-accent"
              >
                Add credits
              </Link>
            </div>
            <button
              type="button"
              className="text-xs text-faint"
              onClick={() => dismissSoftUpsell()}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <section className="mt-8 px-4">
        <SectionLabel>Active</SectionLabel>
        <ul className="space-y-3">
          {listings.map((l) => {
            const count = photos.filter((p) => p.listingId === l.id).length;
            const graded = photos.filter(
              (p) => p.listingId === l.id && p.status === "graded"
            ).length;
            return (
              <li key={l.id}>
                <Link
                  href={`/listings/${l.id}`}
                  className="fw-card block px-4 py-3.5 transition hover:border-line-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {l.address}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {l.city}, {l.state} {l.zip}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-line/70 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">
                      {statusLabel[l.status]}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span>{formatListingPrice(l.price)}</span>
                    <span>·</span>
                    <span>
                      {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sf
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-faint">
                    {count} frames · {graded} graded
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="px-4 py-10 text-center text-xs text-faint">
        Capture is free. Grade & flyer burn credits.
      </p>
    </main>
  );
}
