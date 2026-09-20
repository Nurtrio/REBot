"use client";

import { useMemo, useRef, useState } from "react";
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
import { useClientReady } from "@/hooks/use-client-ready";
import { useListing, useListingPhotos } from "@/hooks/use-listing-store";
import { runGrade } from "@/lib/grade";
import { BURN } from "@/data/plans";
import { estimateGradeCost } from "@/lib/grade-cost";
import type { RoomType } from "@/types";

async function runProGradeViaApi(opts: {
  listingId: string;
  mode: "single" | "batch";
  skyPolish: boolean;
  photos: { photoId: string; room?: RoomType; sourceUrl?: string }[];
}): Promise<{
  engine: string;
  costEstimate?: ReturnType<typeof estimateGradeCost>;
  results: {
    photoId: string;
    ok: boolean;
    model: string;
    gradedDataUrl?: string;
    gradedThumbKey: string;
    error?: string;
    structuralScore?: number;
  }[];
}> {
  const post = await fetch("/api/grade", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      listingId: opts.listingId,
      mode: opts.mode,
      skyPolish: opts.skyPolish,
      photos: opts.photos,
    }),
  });
  if (!post.ok) {
    throw new Error("Failed to start grade job");
  }
  const started = (await post.json()) as {
    jobId: string;
    engine: string;
    costEstimate?: ReturnType<typeof estimateGradeCost>;
  };

  // LUT fallback: run client engine locally
  if (started.engine === "lut-fallback") {
    const photoIds = opts.photos.map((p) => p.photoId);
    const rooms: Record<string, RoomType> = {};
    const sources: Record<string, string | undefined> = {};
    opts.photos.forEach((p) => {
      if (p.room) rooms[p.photoId] = p.room;
      sources[p.photoId] = p.sourceUrl;
    });
    const lut = await runGrade({
      photoIds,
      mode: opts.mode,
      skyPolish: opts.skyPolish,
      rooms,
      sources,
    });
    return {
      engine: "lut-fallback",
      costEstimate: started.costEstimate,
      results: lut.map((r) => ({
        photoId: r.photoId,
        ok: r.ok,
        model: r.model,
        gradedDataUrl: r.gradedDataUrl,
        gradedThumbKey: r.gradedThumbKey,
        error: r.error,
      })),
    };
  }

  // Poll OpenAI / cloud job
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1200));
    const poll = await fetch(`/api/grade?jobId=${encodeURIComponent(started.jobId)}`);
    if (!poll.ok) throw new Error("Grade poll failed");
    const job = (await poll.json()) as {
      status: string;
      engine: string;
      error?: string;
      results?: {
        photoId: string;
        ok: boolean;
        model: string;
        gradedUrl?: string;
        error?: string;
        structuralScore?: number;
      }[];
      costEstimate?: ReturnType<typeof estimateGradeCost>;
    };
    if (job.status === "failed") {
      throw new Error(job.error || "Grade job failed");
    }
    if (job.status === "done" && job.results) {
      return {
        engine: job.engine,
        costEstimate: job.costEstimate ?? started.costEstimate,
        results: job.results.map((r) => ({
          photoId: r.photoId,
          ok: r.ok,
          model: r.model,
          gradedDataUrl: r.gradedUrl,
          gradedThumbKey: `graded-${r.photoId}`,
          error: r.error,
          structuralScore: r.structuralScore,
        })),
      };
    }
  }
  throw new Error("Grade timed out");
}
export default function GradePage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useListing(id);
  const ready = useClientReady();
  const photos = useListingPhotos(id);
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
  const [engineKind, setEngineKind] = useState<string>("client LUT");
  const compareRef = useRef<HTMLDivElement>(null);

  function setSliderFromClientX(clientX: number) {
    const el = compareRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100;
    setSlider(Math.max(5, Math.min(95, pct)));
  }

  const active = photos.find((p) => p.id === activeId) ?? photos[0];

  const targets = useMemo(() => {
    if (mode === "batch") return toGrade.map((p) => p.id);
    return active && active.status === "selected" ? [active.id] : [];
  }, [mode, toGrade, active]);

  const gradeCost = costFn(targets, mode === "batch");
  const skyCost = skyPolish ? targets.length * BURN.skyPolish : 0;
  const cost = gradeCost + skyCost;
  const liveCost = useMemo(
    () =>
      estimateGradeCost({
        photos: targets.length,
        mode,
        fwCredits: cost || targets.length,
      }),
    [targets.length, mode, cost]
  );


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
      const apiPhotos = targets.map((pid) => {
        const p = photos.find((x) => x.id === pid)!;
        return { photoId: pid, room: p.room, sourceUrl: p.dataUrl };
      });

      const { engine, results, costEstimate } = await runProGradeViaApi({
        listingId: id,
        mode,
        skyPolish,
        photos: apiPhotos,
      });
      setEngineKind(engine === "openai" ? "OpenAI pro" : "client LUT");

      const okResults = results.filter((r) => r.ok);
      const failResults = results.filter((r) => !r.ok);

      if (failResults.length === results.length) {
        refundGradeJob(gradeCost, skyCost, id, "all grades failed — refund");
        const allStructural = failResults.every(
          (r) => r.error && /structural/i.test(r.error)
        );
        setMsg(
          allStructural
            ? "Blocked by structural QA — credits refunded. Try LUT or re-shoot."
            : "Grade failed — credits refunded."
        );
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

      const structuralFails = failResults.filter(
        (r) => r.error && /structural/i.test(r.error)
      );

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
      const modelLabel = Array.from(
        new Set(okResults.map((r) => r.model))
      ).join(", ");
      let nextMsg = skyPolish
        ? "Graded with sky polish — MLS disclosure flagged on listing."
        : `Natural grade applied (${modelLabel}). Architecture preserved.`;
      if (structuralFails.length) {
        nextMsg += ` ${structuralFails.length} blocked by structural QA.`;
      } else if (failResults.length) {
        nextMsg += ` ${failResults.length} failed (refunded).`;
      }
      if (costEstimate?.warn && costEstimate.warnReason) {
        nextMsg += ` Cost watch: ${costEstimate.warnReason}`;
      }
      setMsg(nextMsg);
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

  if (!ready) {
    return (
      <main className="px-4 py-8 text-sm text-muted">Loading…</main>
    );
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
    <main className="fw-grade-screen">
      <ScreenHeader
        title="Grade"
        subtitle="Natural color · no structural edits"
        backHref={`/listings/${id}/review`}
        right={<CreditPill balance={balance} />}
      />

      <div className="py-4 space-y-5">
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
              className={`flex-1 min-h-12 rounded-fw border py-3 text-sm font-medium ${
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
            <div
              ref={compareRef}
              className="fw-compare relative aspect-[4/3] overflow-hidden rounded-fw border border-line"
              onPointerDown={(e) => {
                if (!showAfter) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                setSliderFromClientX(e.clientX);
              }}
              onPointerMove={(e) => {
                if (!showAfter || !e.currentTarget.hasPointerCapture(e.pointerId))
                  return;
                setSliderFromClientX(e.clientX);
              }}
            >
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
                className="absolute inset-y-0 w-1 bg-paper shadow"
                style={{ left: `${slider}%` }}
              />
              <div
                className="absolute top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-paper bg-ink/80"
                style={{ left: `${slider}%` }}
                aria-hidden
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
              className="fw-slider mt-2 w-full"
              aria-label="Before after slider"
              disabled={!showAfter}
            />
            <p className="mt-1 text-xs text-muted">
              Engine: {engineKind}
              {active.gradeModel ? ` · ${active.gradeModel}` : ""}
              {" · "}drag compare or use slider
            </p>
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
                  className="h-16 w-16"
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
            className="mt-1 h-5 w-5"
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
        {targets.length > 0 && liveCost.openaiUsd > 0 ? (
          <p
            className={`text-xs ${
              liveCost.warn ? "text-warn" : "text-muted"
            }`}
          >
            OpenAI est. ~${liveCost.openaiUsd.toFixed(2)} ({liveCost.quality}
            ) · FW yield ~${liveCost.fwUsdEquiv.toFixed(2)}
            {liveCost.warn && liveCost.warnReason
              ? ` · ${liveCost.warnReason}`
              : ""}
          </p>
        ) : null}

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
