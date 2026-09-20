"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ScreenHeader,
  Button,
  CreditPill,
  PhotoThumb,
  SectionLabel,
} from "@/components/ui";
import { useAppStore } from "@/store/app-store";

const flagLabel: Record<string, string> = {
  blur: "Blur",
  dupe: "Dupe",
  level_ok: "Level",
  needs_level: "Tilt",
};

export default function ReviewPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const photos = useAppStore((s) => s.getPhotos(id));
  const toggle = useAppStore((s) => s.togglePhotoSelect);
  const balance = useAppStore((s) => s.balance());
  const costFn = useAppStore((s) => s.gradeCostForSelection);

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Review" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  const selected = photos.filter((p) => p.status === "selected");
  const batchCost = costFn(
    selected.map((p) => p.id),
    true
  );

  return (
    <main>
      <ScreenHeader
        title="Review roll"
        subtitle={`${photos.length} frames · tap to select`}
        backHref={`/listings/${id}/shoot`}
        right={<CreditPill balance={balance} />}
      />

      <div className="px-4 py-4">
        <SectionLabel>Flags are mock vision hints</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p) => {
            const sel = p.status === "selected" || p.status === "graded";
            const bad = p.flags.includes("blur") || p.flags.includes("dupe");
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={`overflow-hidden rounded-fw-sm border text-left ${
                  sel ? "border-ink" : "border-line"
                }`}
              >
                <PhotoThumb
                  thumbKey={p.thumbKey}
                  graded={p.status === "graded"}
                  selected={p.status === "selected"}
                  className="aspect-[4/3] w-full"
                />
                <div className="bg-paper-raised px-1.5 py-1.5">
                  <p className="truncate text-[10px] font-medium capitalize text-ink">
                    {p.room}
                  </p>
                  <p className="truncate text-[9px] text-faint">
                    {p.angleLabel}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-0.5">
                    {p.flags
                      .filter((f) => f !== "level_ok")
                      .map((f) => (
                        <span
                          key={f}
                          className={`rounded px-1 text-[8px] uppercase ${
                            bad
                              ? "bg-warn-soft text-warn"
                              : "bg-line text-muted"
                          }`}
                        >
                          {flagLabel[f] ?? f}
                        </span>
                      ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-2">
          <p className="text-sm text-muted">
            {selected.length} selected · batch grade ≈ {batchCost} credits
          </p>
          <Link href={`/listings/${id}/grade`}>
            <Button size="lg" disabled={selected.length === 0}>
              Grade selected
            </Button>
          </Link>
          {selected.length === 0 ? (
            <p className="text-center text-xs text-faint">
              Select frames above, or open Grade to work one-by-one.
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
