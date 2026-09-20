"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ScreenHeader,
  Button,
  CreditPill,
  ConfirmCost,
  SectionLabel,
  PhotoThumb,
} from "@/components/ui";
import { BURN } from "@/data/plans";
import { findPrintShops, mapsSearchUrl } from "@/lib/print-shops";
import { useAppStore } from "@/store/app-store";
import { useClientReady } from "@/hooks/use-client-ready";
import { useListing, useListingPhotos } from "@/hooks/use-listing-store";
import type { PrintShop } from "@/types";

export default function PrintPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useListing(id);
  const ready = useClientReady();
  const photos = useListingPhotos(id);
  const balance = useAppStore((s) => s.balance());
  const canAfford = useAppStore((s) => s.canAfford);
  const burn = useAppStore((s) => s.burn);

  const graded = photos.filter((p) => p.status === "graded");
  const [zip, setZip] = useState(listing?.zip ?? "");
  const [radius, setRadius] = useState<5 | 10 | 25>(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [shops, setShops] = useState<PrintShop[]>([]);
  const [meta, setMeta] = useState<{
    source: string;
    message?: string;
    mapsFallbackUrl: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [prepMsg, setPrepMsg] = useState<string | null>(null);

  const prepCost = selected.length * BURN.heroUpscale;

  if (!ready) {
    return (
      <main className="px-4 py-8 text-sm text-muted">Loading…</main>
    );
  }

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Print" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  async function search() {
    if (!zip.trim()) return;
    setBusy(true);
    try {
      const res = await findPrintShops(zip.trim(), radius);
      setShops(res.shops);
      setMeta({
        source: res.source,
        message: res.message,
        mapsFallbackUrl: res.mapsFallbackUrl,
      });
    } finally {
      setBusy(false);
    }
  }

  function togglePrep(pid: string) {
    setSelected((s) =>
      s.includes(pid) ? s.filter((x) => x !== pid) : [...s, pid]
    );
  }

  function doPrep() {
    setPrepMsg(null);
    if (selected.length === 0) return;
    if (!canAfford(prepCost)) {
      setPrepMsg("Not enough credits for print prep.");
      return;
    }
    burn(prepCost, "hero_upscale", id, `${selected.length} hero upscales`);
    setPrepMsg(
      `Print prep applied to ${selected.length} image(s) (−${prepCost} credits).`
    );
    setSelected([]);
  }

  return (
    <main>
      <ScreenHeader
        title="Print"
        subtitle="You download the PDF; you choose the shop."
        backHref={`/listings/${id}/flyer`}
        right={<CreditPill balance={balance} />}
      />

      <div className="space-y-5 px-4 py-4">
        <p className="text-sm text-muted">
          Print near you — we’ll find shops by ZIP.
        </p>

        <div>
          <SectionLabel>Optional print prep (2 cr each)</SectionLabel>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(graded.length ? graded : photos.slice(0, 6)).map((p) => {
              const on = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePrep(p.id)}
                  className={`shrink-0 overflow-hidden rounded-fw-sm border ${
                    on ? "border-ink" : "border-line"
                  }`}
                >
                  <PhotoThumb
                    thumbKey={p.gradedThumbKey ?? p.thumbKey}
                    graded={p.status === "graded"}
                    selected={on}
                    className="h-16 w-20"
                  />
                </button>
              );
            })}
          </div>
          {selected.length > 0 ? (
            <div className="mt-3 space-y-2">
              <ConfirmCost cost={prepCost} balance={balance} label="Prep will cost" />
              <Button size="sm" onClick={doPrep}>
                Prep for print
              </Button>
            </div>
          ) : null}
          {prepMsg ? <p className="mt-2 text-sm text-level">{prepMsg}</p> : null}
        </div>

        <div>
          <SectionLabel>ZIP</SectionLabel>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-fw-sm border border-line bg-paper-raised px-3 py-2.5 text-sm outline-none focus:border-ink/40"
              inputMode="numeric"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="90402"
            />
            <Button onClick={search} disabled={busy}>
              {busy ? "…" : "Search"}
            </Button>
          </div>
          <div className="mt-2 flex gap-1.5">
            {([5, 10, 25] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadius(r)}
                className={`rounded-full px-3 py-1 text-xs ${
                  radius === r
                    ? "bg-ink text-paper"
                    : "bg-line/60 text-muted"
                }`}
              >
                {r} mi
              </button>
            ))}
          </div>
        </div>

        {meta ? (
          <div>
            <SectionLabel>Nearby shops</SectionLabel>
            {meta.message ? (
              <p className="mb-3 text-xs text-muted">{meta.message}</p>
            ) : null}
            <ul className="space-y-2">
              {shops.map((s) => (
                <li key={s.id} className="fw-card px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{s.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{s.address}</p>
                      <p className="mt-1 text-xs text-faint">
                        {s.distanceMi.toFixed(1)} mi
                        {s.rating ? ` · ★ ${s.rating}` : ""}
                        {s.openNow ? " · Open now" : " · Closed"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {s.phone ? (
                      <a
                        href={`tel:${s.phone}`}
                        className="rounded-full border border-line px-2.5 py-1"
                      >
                        Call
                      </a>
                    ) : null}
                    <a
                      href={s.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-line px-2.5 py-1"
                    >
                      Directions
                    </a>
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-line px-2.5 py-1"
                      >
                        Website
                      </a>
                    ) : null}
                    <a
                      href={`mailto:?subject=${encodeURIComponent(
                        `Print order — ${listing.address}`
                      )}&body=${encodeURIComponent(
                        `Hi — please print the attached flyer PDF for ${listing.address}. (Attach the PDF from Framewalk download.)`
                      )}`}
                      className="rounded-full border border-line px-2.5 py-1"
                    >
                      Email PDF
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            {shops.length === 0 ? (
              <div className="fw-card px-4 py-5 text-center text-sm text-muted">
                No shops in radius.
                <a
                  href={meta.mapsFallbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block font-medium text-accent"
                >
                  Search Google Maps
                </a>
              </div>
            ) : (
              <a
                href={meta.mapsFallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block text-center text-xs text-accent"
              >
                Open full Maps search
              </a>
            )}
          </div>
        ) : (
          <a
            href={mapsSearchUrl(zip || listing.zip)}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-sm text-accent"
          >
            Or search Google Maps now
          </a>
        )}

        <Link href={`/listings/${id}/flyer`}>
          <Button variant="ghost" size="lg">
            Back to flyer
          </Button>
        </Link>
      </div>
    </main>
  );
}
