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
import type { RoomType } from "@/types";

export default function GradePage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const photos = useAppStore((s) => s.getPhotos(id));
  const balance = useAppStore((s) => s.balance());
  const canAfford = useAppStore((s) => s.canAfford);
  const burnGradeJob = useAppStore((s) => s.burnGradeJob);
  const refundGradeJob = useAppStore((s) => s.refundGradeJob);
  const markGraded = useAppStore((s) => s.markGraded);
  const rejectGrade = useAppStore((s) => s.rejectGrade);
  const costFn = useAppStore((s) => s.gradeCostForSelection);

  const toGrade = photos.filter((p) => p.status === "selected");
  const graded = photos.filter((p) => p.status === "graded");

  const [mode, setMode] = useState<"single" | "batch">("batch");
  const [activeId, setActiveId] = useState(
    toGrade[0]?.id ?? graded[0]?.id ?? photos[0]?.id
  );
  const [slider, setSlider] = useState(65);
  const [skyPolish, setSkyPolish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [doneIds, setDoneIds] = useState<string[]>([]);
  const [lastModels, setLastModels] = useState<string[]>([]);

  const active = photos.find((p) => p.id === activeId) ?? photos[0];

  const targets = useMemo(() => {
    if (mode === "batch") return toGrade.map((p) => p.id);
    return active && active.status === "selected" ? [active.id] : [];
  }, [mode, toGrade, active]);

  const gradeCost = costFn(targets, mode === "batch");
  const skyCost = skyPolish ? targets.length * BURN.skyPolish : 0;
  const cost = gradeCost + skyCost;

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

    // Reserve / burn first — never grade then fail to charge
    const reserved = burnGradeJob(gradeCost, skyCost, id, mode === "batch");
    if (!reserved) {
      setMsg("Could not reserve credits.");
      return;
    }

    setBusy(true);
    try {
      const rooms: Record<string, RoomType> = {};
      const sources: Record<string, string | undefined> = {};
      targets.forEach((pid) => {
        const p = photos.find((x) => x.id === pid);
        if (p) {
          rooms[pid] = p.room;
          sources[pid] = p.dataUrl;
        }
      });

      const results = await runGrade({
        photoIds: targets,
        mode,
        skyPolish,
        rooms,
        sources,
      });

      const okResults = results.filter((r) => r.ok);
      const failResults = results.filter((r) => !r.ok);

      if (failResults.length === results.length) {
        refundGradeJob(gradeCost, skyCost, id, "all grades failed — refund");
        setMsg("Grade failed — credits refunded.");
        return;
      }

      if (failResults.length > 0) {
        const failN = failResults.length;
        const perGrade = gradeCost / Math.max(targets.length, 1);
        const perSky = skyCost / Math.max(targets.length, 1);
        refundGradeJob(
          Math.ceil(perGrade * failN),
          Math.ceil(perSky * failN),
          id,
          `${failN} frame(s) failed — partial refund`
        );
      }

      const keys: Record<string, string> = {};
      const urls: Record<string, string> = {};
      const models: Record<string, string> = {};
      okResults.forEach((r) => {
        keys[r.photoId] = r.gradedThumbKey;
        if (r.gradedDataUrl) urls[r.photoId] = r.gradedDataUrl;
        models[r.photoId] = r.model;
      });
      markGraded(okResults.map((r) => r.photoId), keys, {
        gradedDataUrls: urls,
        models,
        skyPolished: skyPolish,
        listingId: id,
      });
      setDoneIds(okResults.map((r) => r.photoId));
      setLastModels(Array.from(new Set(okResults.map((r) => r.model))));
      if (okResults[0]) setActiveId(okResults[0].photoId);
      setMsg(
        skyPolish
          ? "Graded with sky polish — MLS disclosure flagged on listing."
          : `Natural grade applied (${Array.from(new Set(okResults.map((r) => r.model))).join(", ")}). Architecture preserved.`
      );
    } catch {
      refundGradeJob(gradeCost, skyCost, id, "grade crashed — refund");
      setMsg("Grade crashed — credits refunded.");
    } finally {
      setBusy(false);
    }
  }

  function onRejectRedo() {
    const ids = doneIds.length ? doneIds : graded.map((p) => p.id);
    if (!ids.length) return;
    rejectGrade(ids);
    setDoneIds([]);
    setMsg("Rejected — frames back in Selected for redo. Credits stay burned (re-grade will charge again).");
  }

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Grade" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  const beforeUrl = active?.dataUrl;
  const afterUrl = active?.gradedDataUrl;
  const showAfter = !!afterUrl || active?.status === "graded";

  return (
    <main>
      <ScreenHeader
        title="Grade"
        subtitle="Natural color · no structural edits"
        backHref={`/listings/${id}/review`}
        right={<CreditPill balance={balance} />}
      />

      <div className="px-4 py-4 space-y-5">
        {listing.mlsDisclosure ? (
          <div className="rounded-fw border border-warn/30 bg-warn/10 px-3 py-2 text-xs text-warn">
            MLS disclosure: sky polish used on one or more frames in this listing.
          </div>
        ) : null}

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
                dataUrl={beforeUrl}
                className="absolute inset-0 h-full w-full"
              />
              {showAfter ? (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${slider}%` }}
                >
                  <div
                    className="absolute inset-y-0 left-0 h-full"
                    style={{ width: `${10000 / Math.max(slider, 1)}%` }}
                  >
                    <PhotoThumb
                      thumbKey={active.gradedThumbKey ?? `graded-${active.thumbKey}`}
                      dataUrl={afterUrl}
                      graded
                      className="h-full w-full"
                    />
                  </div>
                </div>
              ) : null}
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
              disabled={!showAfter}
            />
            {active.gradeModel ? (
              <p className="mt-1 text-xs text-muted">Model: {active.gradeModel}</p>
            ) : null}
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
                  dataUrl={p.gradedDataUrl ?? p.dataUrl}
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
            {toGrade.length > 10 ? " · 0.8× after first 10" : ""}.
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
              (+{BURN.skyPolish} cr / photo) — opt-in only. Separate{" "}
              <code className="text-xs">sky_polish</code> ledger burn + MLS
              disclosure flag. Never invents amenities.
            </span>
          </span>
        </label>

        <ConfirmCost cost={cost} balance={balance} />

        {msg ? (
          <p
            className={`text-sm ${
              doneIds.length ? "text-level" : "text-warn"
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

        {doneIds.length > 0 ? (
          <div className="space-y-2">
            <SectionLabel>QA</SectionLabel>
            <p className="text-xs text-muted">
              Accept keeps graded derivatives
              {lastModels.length ? ` (${lastModels.join(", ")})` : ""}. Reject
              returns frames to Selected for redo.
            </p>
            <div className="flex gap-2">
              <Link href={`/listings/${id}/gallery`} className="flex-1">
                <Button variant="secondary" size="lg" className="w-full">
                  Accept · gallery
                </Button>
              </Link>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={onRejectRedo}
              >
                Reject · redo
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
