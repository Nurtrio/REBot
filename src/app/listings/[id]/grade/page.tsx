"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ScreenHeader,
  Button,
  CreditPill,
  ConfirmCost,
  PhotoThumb,
  SectionLabel,
} from "@/components/ui";
import { useAppStore } from "@/store/app-store";
import { runGrade } from "@/lib/grade";
import { BURN } from "@/data/plans";

export default function GradePage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const photos = useAppStore((s) => s.getPhotos(id));
  const balance = useAppStore((s) => s.balance());
  const canAfford = useAppStore((s) => s.canAfford);
  const burn = useAppStore((s) => s.burn);
  const markGraded = useAppStore((s) => s.markGraded);
  const costFn = useAppStore((s) => s.gradeCostForSelection);

  const selectable = photos.filter(
    (p) => p.status === "selected" || p.status === "graded"
  );
  const toGrade = photos.filter((p) => p.status === "selected");

  const [mode, setMode] = useState<"single" | "batch">("batch");
  const [activeId, setActiveId] = useState(
    toGrade[0]?.id ?? selectable[0]?.id ?? photos[0]?.id
  );
  const [slider, setSlider] = useState(65);
  const [skyPolish, setSkyPolish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const active = photos.find((p) => p.id === activeId) ?? photos[0];

  const targets = useMemo(() => {
    if (mode === "batch") return toGrade.map((p) => p.id);
    return active ? [active.id] : [];
  }, [mode, toGrade, active]);

  const baseCost = costFn(targets, mode === "batch");
  const cost = baseCost + (skyPolish ? targets.length * BURN.skyPolish : 0);

  async function confirmGrade() {
    setMsg(null);
    if (targets.length === 0) {
      setMsg("Select photos in Review first.");
      return;
    }
    if (!canAfford(cost)) {
      setMsg("Out of credits. Top up to finish this listing.");
      return;
    }
    setBusy(true);
    try {
      const results = await runGrade({
        photoIds: targets,
        mode,
        skyPolish,
      });
      const ok = burn(
        cost,
        mode === "batch" ? "batch_grade" : "grade",
        id,
        skyPolish ? "grade + sky polish" : "natural grade"
      );
      if (!ok) {
        setMsg("Could not burn credits.");
        return;
      }
      const keys: Record<string, string> = {};
      results.forEach((r) => {
        keys[r.photoId] = r.gradedThumbKey;
      });
      markGraded(targets, keys);
      setDone(true);
      setMsg(
        skyPolish
          ? "Graded with sky polish — disclose on MLS."
          : "Natural grade applied. Architecture preserved."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Grade" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  return (
    <main>
      <ScreenHeader
        title="Grade"
        subtitle="Natural color · no structural edits"
        backHref={`/listings/${id}/review`}
        right={<CreditPill balance={balance} />}
      />

      <div className="px-4 py-4 space-y-5">
        <div className="flex gap-2">
          {(
            [
              ["batch", "Batch"],
              ["single", "Single"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-fw border py-2 text-sm ${
                mode === m
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-paper-raised text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {active ? (
          <div>
            <SectionLabel>Before / after</SectionLabel>
            <div className="relative aspect-[4/3] overflow-hidden rounded-fw border border-line">
              <PhotoThumb
                thumbKey={active.thumbKey}
                className="absolute inset-0 h-full w-full"
              />
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${slider}%` }}
              >
                <PhotoThumb
                  thumbKey={active.gradedThumbKey ?? active.thumbKey}
                  graded
                  className="h-full"
                  // force width of parent container sense — use fixed aspect box width
                />
                {/* widen graded layer */}
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${10000 / Math.max(slider, 1)}%` }}
                >
                  <PhotoThumb
                    thumbKey={`graded-preview-${active.thumbKey}`}
                    graded
                    className="h-full w-full"
                  />
                </div>
              </div>
              <div
                className="absolute inset-y-0 w-0.5 bg-paper"
                style={{ left: `${slider}%` }}
              />
              <span className="absolute left-2 top-2 rounded bg-black/50 px-1.5 py-0.5 text-[9px] uppercase text-white">
                Before
              </span>
              <span className="absolute right-2 top-2 rounded bg-level/90 px-1.5 py-0.5 text-[9px] uppercase text-white">
                After
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={95}
              value={slider}
              onChange={(e) => setSlider(Number(e.target.value))}
              className="fw-slider mt-3 w-full"
              aria-label="Before after slider"
            />
          </div>
        ) : null}

        {mode === "single" ? (
          <div className="flex gap-2 overflow-x-auto">
            {(toGrade.length ? toGrade : photos).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setActiveId(p.id)}
                className={`shrink-0 overflow-hidden rounded-fw-sm border ${
                  p.id === activeId ? "border-ink" : "border-line"
                }`}
              >
                <PhotoThumb
                  thumbKey={p.thumbKey}
                  graded={p.status === "graded"}
                  className="h-14 w-14"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            Batching {toGrade.length} selected frame
            {toGrade.length === 1 ? "" : "s"}
            {toGrade.length > 10
              ? " · 0.8× after first 10"
              : ""}
            .
          </p>
        )}

        <label className="flex items-start gap-3 rounded-fw border border-line bg-paper-raised px-3 py-3 text-sm">
          <input
            type="checkbox"
            checked={skyPolish}
            onChange={(e) => setSkyPolish(e.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-ink">Sky polish</span>
            <span className="text-muted">
              {" "}
              (+{BURN.skyPolish} cr / photo) — opt-in only. Adds MLS disclosure
              flag. Never invents amenities.
            </span>
          </span>
        </label>

        <ConfirmCost cost={cost} balance={balance} />

        {msg ? (
          <p
            className={`text-sm ${
              done ? "text-level" : "text-warn"
            }`}
          >
            {msg}
          </p>
        ) : null}

        {!canAfford(cost) && targets.length > 0 ? (
          <div className="rounded-fw border border-danger/25 bg-danger-soft px-3 py-3 text-sm text-danger">
            Out of credits. Top up 150 for $29 and finish this listing.
            <Link
              href="/billing"
              className="mt-2 block font-medium underline"
            >
              Top up 150
            </Link>
          </div>
        ) : (
          <Button
            size="lg"
            disabled={busy || targets.length === 0}
            onClick={confirmGrade}
          >
            {busy ? "Grading…" : `Confirm · ${cost} credits`}
          </Button>
        )}

        {done ? (
          <Link href={`/listings/${id}/gallery`}>
            <Button variant="secondary" size="lg" className="mt-2">
              Open gallery
            </Button>
          </Link>
        ) : null}
      </div>
    </main>
  );
}
