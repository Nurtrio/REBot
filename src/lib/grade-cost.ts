/**
 * OpenAI Images Edit cost watch vs Framewalk credit burn.
 * USD figures are working estimates — tune after first live invoice.
 */

export type GradeQuality = "low" | "medium" | "high";

/** Approx USD per gpt-image edit (working). Override via env if needed. */
// Client-safe defaults (server API may override via its own env reads).
export const OPENAI_USD_PER_EDIT: Record<GradeQuality, number> = {
  low: 0.02,
  medium: 0.07,
  high: 0.19,
};

/** Assumed revenue per Framewalk grade credit (Starter ~$29/120 ≈ $0.24). */
export const FW_USD_PER_CREDIT = Number((29 / 120).toFixed(4));

export function qualityForMode(mode: "single" | "batch"): GradeQuality {
  return mode === "batch" ? "low" : "medium";
}

export interface GradeCostEstimate {
  photos: number;
  quality: GradeQuality;
  usdPerEdit: number;
  openaiUsd: number;
  fwCredits: number;
  fwUsdEquiv: number;
  /** openaiUsd / fwUsdEquiv — >1 means we lose money on COGS */
  costRatio: number;
  warn: boolean;
  warnReason?: string;
}

export function estimateGradeCost(opts: {
  photos: number;
  mode: "single" | "batch";
  fwCredits: number;
  skyPolishExtras?: number;
}): GradeCostEstimate {
  const quality = qualityForMode(opts.mode);
  const usdPerEdit = OPENAI_USD_PER_EDIT[quality];
  const openaiUsd =
    Math.round(opts.photos * usdPerEdit * 1000) / 1000;
  const fwCredits = opts.fwCredits;
  const fwUsdEquiv =
    Math.round(fwCredits * FW_USD_PER_CREDIT * 1000) / 1000;
  const costRatio =
    fwUsdEquiv > 0
      ? Math.round((openaiUsd / fwUsdEquiv) * 100) / 100
      : 99;

  let warn = false;
  let warnReason: string | undefined;
  if (opts.mode === "batch" && opts.photos >= 20) {
    warn = true;
    warnReason = `Large batch (${opts.photos}) — ~$${openaiUsd.toFixed(2)} OpenAI vs ${fwCredits} FW credits`;
  } else if (costRatio > 1.25) {
    warn = true;
    warnReason = `OpenAI COGS ~$${openaiUsd.toFixed(2)} exceeds credit yield ~$${fwUsdEquiv.toFixed(2)} (ratio ${costRatio})`;
  }

  return {
    photos: opts.photos,
    quality,
    usdPerEdit,
    openaiUsd,
    fwCredits,
    fwUsdEquiv,
    costRatio,
    warn,
    warnReason,
  };
}
