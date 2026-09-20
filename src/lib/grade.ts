/**
 * Natural grade pipeline — client-side LUT stub with model routing.
 * Never invents furniture, walls, or amenities. Color/tone only.
 */

import type { RoomType } from "@/types";

export type GradeMode = "single" | "batch";

/**
 * Stable model ids. Client LUT ids today; cloud vision/grade ids plug in
 * later without changing GradeRequest / GradeResult / pickModel callers.
 */
export type GradeModelId =
  | "lut-natural-v1"
  | "lut-interior-warm"
  | "lut-exterior-sky"
  | "lut-batch-fast"
  | (string & {});

/**
 * Pluggable grade backend. Swap `setGradeEngine(cloudEngine)` when the
 * vision/grade API is ready — UI keeps calling runGrade().
 */
export interface GradeEngine {
  readonly kind: "client-lut" | "cloud";
  pickModel: (
    room: RoomType | undefined,
    mode: GradeMode,
    skyPolish: boolean
  ) => GradeModelId;
  run: (req: GradeRequest) => Promise<GradeResult[]>;
}

export interface GradeRequest {
  photoIds: string[];
  mode: GradeMode;
  skyPolish?: boolean;
  /** Room per photo for model routing */
  rooms?: Record<string, RoomType>;
  /** Live capture or prior derivative data URLs */
  sources?: Record<string, string | undefined>;
}

export interface GradeResult {
  photoId: string;
  ok: boolean;
  model: GradeModelId;
  gradedThumbKey: string;
  /** Real derivative (canvas JPEG data URL) when available */
  gradedDataUrl?: string;
  message?: string;
  error?: string;
}

export function pickModel(
  room: RoomType | undefined,
  mode: GradeMode,
  skyPolish: boolean
): GradeModelId {
  if (skyPolish && (room === "exterior" || room === "yard")) {
    return "lut-exterior-sky";
  }
  if (mode === "batch") return "lut-batch-fast";
  if (room === "kitchen" || room === "bathroom" || room === "living") {
    return "lut-interior-warm";
  }
  return "lut-natural-v1";
}

/** Organic tone curve params — never structural */
function modelParams(model: GradeModelId, skyPolish: boolean) {
  switch (model) {
    case "lut-interior-warm":
      return { brightness: 1.06, contrast: 1.08, saturate: 1.1, warm: 8, sky: 0 };
    case "lut-exterior-sky":
      return {
        brightness: 1.04,
        contrast: 1.1,
        saturate: 1.12,
        warm: 2,
        sky: skyPolish ? 18 : 6,
      };
    case "lut-batch-fast":
      return { brightness: 1.05, contrast: 1.06, saturate: 1.08, warm: 4, sky: skyPolish ? 10 : 0 };
    default:
      return {
        brightness: 1.05,
        contrast: 1.07,
        saturate: 1.09,
        warm: 5,
        sky: skyPolish ? 12 : 0,
      };
  }
}

function hashHue(key: string): number {
  return Math.abs(key.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 40;
}

/** Synthesize a placeholder frame when no capture data URL exists */
function placeholderFrame(
  thumbKey: string,
  w = 640,
  h = 480
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const hue = hashHue(thumbKey);
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${36 + hue} 12% 42%)`);
  g.addColorStop(1, `hsl(${24 + hue} 10% 18%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const radial = ctx.createRadialGradient(w * 0.3, h * 0.2, 0, w * 0.3, h * 0.2, w * 0.6);
  radial.addColorStop(0, "rgba(255,255,255,0.22)");
  radial.addColorStop(1, "transparent");
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

/**
 * Apply organic color grade on a canvas. Sky polish only lifts cool tones
 * in the upper third — no object synthesis.
 */
export async function applyNaturalGrade(
  sourceDataUrl: string | undefined,
  thumbKey: string,
  model: GradeModelId,
  skyPolish: boolean
): Promise<string> {
  const params = modelParams(model, skyPolish);
  let canvas: HTMLCanvasElement;

  if (sourceDataUrl?.startsWith("data:")) {
    try {
      const img = await loadImage(sourceDataUrl);
      canvas = document.createElement("canvas");
      const maxW = 960;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch {
      canvas = placeholderFrame(thumbKey);
    }
  } else {
    canvas = placeholderFrame(thumbKey);
  }

  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  const skyBand = Math.floor(height / 3);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // brightness
      r *= params.brightness;
      g *= params.brightness;
      b *= params.brightness;

      // contrast around mid-gray
      r = (r - 128) * params.contrast + 128;
      g = (g - 128) * params.contrast + 128;
      b = (b - 128) * params.contrast + 128;

      // saturation toward luma
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      r = luma + (r - luma) * params.saturate;
      g = luma + (g - luma) * params.saturate;
      b = luma + (b - luma) * params.saturate;

      // gentle warm shift (organic, not staging)
      r += params.warm * 0.35;
      b -= params.warm * 0.2;

      // sky polish: cool lift in upper third only
      if (params.sky > 0 && y < skyBand) {
        const t = 1 - y / skyBand;
        b += params.sky * t * 0.7;
        g += params.sky * t * 0.25;
      }

      d[i] = Math.max(0, Math.min(255, r));
      d[i + 1] = Math.max(0, Math.min(255, g));
      d[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.86);
}

async function runClientLut(req: GradeRequest): Promise<GradeResult[]> {
  const results: GradeResult[] = [];
  for (const photoId of req.photoIds) {
    const room = req.rooms?.[photoId];
    const model = pickModel(room, req.mode, !!req.skyPolish);
    const thumbKey = `graded-${photoId}`;
    try {
      await new Promise((r) => setTimeout(r, req.mode === "batch" ? 180 : 320));
      const gradedDataUrl = await applyNaturalGrade(
        req.sources?.[photoId],
        thumbKey,
        model,
        !!req.skyPolish
      );
      results.push({
        photoId,
        ok: true,
        model,
        gradedThumbKey: thumbKey,
        gradedDataUrl,
        message: req.skyPolish
          ? `Natural grade (${model}) + sky polish — disclose on MLS`
          : `Natural grade (${model}) — architecture preserved`,
      });
    } catch (e) {
      results.push({
        photoId,
        ok: false,
        model,
        gradedThumbKey: thumbKey,
        error: e instanceof Error ? e.message : "grade failed",
        message: "Grade failed — credits will be refunded",
      });
    }
  }
  return results;
}

/** Default engine — organic client LUT. Replace via setGradeEngine. */
export const clientLutEngine: GradeEngine = {
  kind: "client-lut",
  pickModel,
  run: runClientLut,
};

let activeEngine: GradeEngine = clientLutEngine;

export function getGradeEngine(): GradeEngine {
  return activeEngine;
}

export function setGradeEngine(engine: GradeEngine): void {
  activeEngine = engine;
}

/** Facade — always go through the active GradeEngine */
export async function runGrade(req: GradeRequest): Promise<GradeResult[]> {
  return activeEngine.run(req);
}
