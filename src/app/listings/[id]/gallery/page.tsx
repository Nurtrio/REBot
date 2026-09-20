"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ScreenHeader,
  Button,
  CreditPill,
  PhotoThumb,
  SectionLabel,
} from "@/components/ui";
import { ROOM_ORDER } from "@/data/seed";
import { useAppStore } from "@/store/app-store";
import type { Photo } from "@/types";

function autoOrder(photos: Photo[]): string[] {
  const graded = photos.filter(
    (p) => p.status === "graded" || p.status === "selected"
  );
  const byRoom = [...ROOM_ORDER];
  const sorted = [...graded].sort((a, b) => {
    const ai = byRoom.indexOf(a.room);
    const bi = byRoom.indexOf(b.room);
    if (ai !== bi) return ai - bi;
    return a.capturedAt.localeCompare(b.capturedAt);
  });
  // Prefer graded; skip blur/dupe unless graded
  return sorted
    .filter(
      (p) =>
        p.status === "graded" ||
        (!p.flags.includes("blur") && !p.flags.includes("dupe"))
    )
    .map((p) => p.id);
}

export default function GalleryPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const photos = useAppStore((s) => s.getPhotos(id));
  const setGalleryOrder = useAppStore((s) => s.setGalleryOrder);
  const balance = useAppStore((s) => s.balance());

  const initial = useMemo(() => {
    if (listing?.galleryOrder.length) return listing.galleryOrder;
    return autoOrder(photos);
  }, [listing, photos]);

  const [order, setOrder] = useState<string[]>(initial);
  const [saved, setSaved] = useState(false);

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Gallery" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  const byId = Object.fromEntries(photos.map((p) => [p.id, p]));

  function move(idx: number, dir: -1 | 1) {
    const next = [...order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setOrder(next);
    setSaved(false);
  }

  function approve() {
    setGalleryOrder(id, order);
    setSaved(true);
  }

  return (
    <main>
      <ScreenHeader
        title="Gallery"
        subtitle="Exterior → living → kitchen → beds → baths → yard"
        backHref={`/listings/${id}`}
        right={<CreditPill balance={balance} />}
      />

      <div className="px-4 py-4">
        <SectionLabel>Curated order</SectionLabel>
        <ol className="space-y-2">
          {order.map((pid, idx) => {
            const p = byId[pid];
            if (!p) return null;
            return (
              <li
                key={pid}
                className="flex items-center gap-3 rounded-fw border border-line bg-paper-raised p-2"
              >
                <span className="w-6 text-center text-xs text-faint">
                  {idx + 1}
                </span>
                <PhotoThumb
                  thumbKey={p.gradedThumbKey ?? p.thumbKey}
                  graded={p.status === "graded"}
                  className="h-14 w-16 shrink-0 rounded-fw-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium capitalize text-ink">
                    {p.room}
                  </p>
                  <p className="truncate text-xs text-muted">{p.angleLabel}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className="h-7 w-7 rounded border border-line text-xs"
                    onClick={() => move(idx, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="h-7 w-7 rounded border border-line text-xs"
                    onClick={() => move(idx, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                </div>
              </li>
            );
          })}
        </ol>

        {order.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            Grade some frames first, then curate.
          </p>
        ) : null}

        <div className="mt-6 space-y-2">
          <Button size="lg" onClick={approve} disabled={order.length === 0}>
            {saved ? "Gallery approved" : "Approve gallery"}
          </Button>
          {saved ? (
            <div className="rounded-fw border border-accent/25 bg-accent-soft px-3 py-3 text-sm text-ink-soft">
              Gallery ready. Make a flyer?
              <Link
                href={`/listings/${id}/flyer`}
                className="mt-2 block font-medium text-accent"
              >
                Make a flyer →
              </Link>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              type="button"
              onClick={() => {
                setOrder(autoOrder(photos));
                setSaved(false);
              }}
            >
              Reset auto-order
            </Button>
            <Link href={`/listings/${id}/print`} className="flex-1">
              <Button variant="ghost" className="w-full" type="button">
                Print
              </Button>
            </Link>
          </div>
          <p className="text-center text-xs text-faint">
            Export ZIP / MLS sizes — stub (phase 2 storage).
          </p>
        </div>
      </div>
    </main>
  );
}
