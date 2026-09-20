/**
 * OpenAI Images Edit client for Framewalk pro RE grade.
 * Hard gate: color/tone only — never ask for staging, object removal, or structural change.
 * Aspect: shoot captures are 4:3 (1280×960). We letterbox → square for the API, then crop back.
 */

import sharp from "sharp";
import type { RoomType } from "@/types";

const OPENAI_IMAGES_EDIT = "https://api.openai.com/v1/images/edits";

/** OpenAI Images Edit square size we letterbox into */
const EDIT_SIZE = 1024;

export type GradePack = "interior" | "exterior";

export function packForRoom(room?: RoomType): GradePack {
  return room === "exterior" || room === "yard" ? "exterior" : "interior";
}

export function modelIdFor(
  room: RoomType | undefined,
  mode: "single" | "batch",
  skyPolish: boolean
): string {
  if (skyPolish && (room === "exterior" || room === "yard")) {
    return "re-exterior-sky-v1";
  }
  if (mode === "batch") return "re-batch-fast-v1";
  if (room === "exterior" || room === "yard") return "re-exterior-pro-v1";
  return "re-interior-pro-v1";
}

function buildPrompt(pack: GradePack, skyPolish: boolean): string {
  const base =
    "You are a professional real-estate photo colorist. Apply a natural, organic grade only: " +
    "correct white balance, exposure, contrast, and mild warmth. " +
    "CRITICAL HARD RULES: Do NOT add, remove, move, or invent any furniture, people, plants, walls, floors, fixtures, or amenities. " +
    "Do NOT virtual stage. Do NOT change architecture, room layout, or materials. " +
    "Preserve the true look of the property. Output must look like a skilled Lightroom pass, not generative AI art. " +
    "The input may include neutral letterbox bars to preserve a 4:3 frame — leave those bars unchanged; only grade the photo content.";

  if (pack === "interior") {
    return (
      base +
      " Interior pack: neutralize mixed tungsten/daylight WB; lift shadow detail in window-lit rooms without crushing highlights; " +
      "gentle window-view recovery through glass when possible (tone only); keep wood tones warm but not orange."
    );
  }

  if (skyPolish) {
    return (
      base +
      " Exterior pack with sky polish OPT-IN: balance facade and landscaping; " +
      "apply a subtle cool lift / haze clean ONLY in the sky region. Do NOT replace the sky with a stock plate or fake clouds. " +
      "Do NOT change landscaping, cars, or building structure."
    );
  }

  return (
    base +
    " Exterior pack: balanced facade and landscaping exposure/contrast. Do not alter sky content unless needed for mild haze cleanup without replacement."
  );
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) {
    throw new Error("source must be a data URL");
  }
  return {
    contentType: m[1] || "image/jpeg",
    buffer: Buffer.from(m[2], "base64"),
  };
}

async function fetchUrlToBuffer(
  url: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch source image (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ab = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), contentType };
}

/**
 * Fit image into EDIT_SIZE×EDIT_SIZE with neutral letterbox bars (no stretch).
 * Returns square PNG + crop box to recover original aspect after edit.
 */
export async function letterboxToSquare(input: Buffer): Promise<{
  squarePng: Buffer;
  /** Content rect inside the square (pixels) */
  content: { left: number; top: number; width: number; height: number };
  /** Original pixel size (for output target) */
  original: { width: number; height: number };
}> {
  const meta = await sharp(input).metadata();
  const ow = meta.width || 1280;
  const oh = meta.height || 960;

  const scale = Math.min(EDIT_SIZE / ow, EDIT_SIZE / oh);
  const tw = Math.max(1, Math.round(ow * scale));
  const th = Math.max(1, Math.round(oh * scale));
  const left = Math.floor((EDIT_SIZE - tw) / 2);
  const top = Math.floor((EDIT_SIZE - th) / 2);

  const resized = await sharp(input)
    .rotate() // honor EXIF orientation from iPhone
    .resize(tw, th, { fit: "fill" })
    .png()
    .toBuffer();

  const squarePng = await sharp({
    create: {
      width: EDIT_SIZE,
      height: EDIT_SIZE,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();

  return {
    squarePng,
    content: { left, top, width: tw, height: th },
    original: { width: ow, height: oh },
  };
}

/** Crop letterboxed edit result back to original aspect; encode JPEG. */
export async function cropSquareToOriginalAspect(
  squareBuffer: Buffer,
  content: { left: number; top: number; width: number; height: number },
  original: { width: number; height: number }
): Promise<string> {
  const cropped = await sharp(squareBuffer)
    .extract({
      left: content.left,
      top: content.top,
      width: content.width,
      height: content.height,
    })
    .resize(original.width, original.height, { fit: "fill" })
    .jpeg({ quality: 88 })
    .toBuffer();

  return `data:image/jpeg;base64,${cropped.toString("base64")}`;
}

export async function enhanceWithOpenAI(opts: {
  apiKey: string;
  sourceUrl?: string;
  pack: GradePack;
  skyPolish: boolean;
  quality?: "low" | "medium" | "high";
  model?: string;
}): Promise<string> {
  if (!opts.sourceUrl) {
    throw new Error("missing source image");
  }

  const { buffer } = opts.sourceUrl.startsWith("data:")
    ? dataUrlToBuffer(opts.sourceUrl)
    : await fetchUrlToBuffer(opts.sourceUrl);

  const { squarePng, content, original } = await letterboxToSquare(buffer);

  const model = opts.model || process.env.OPENAI_GRADE_MODEL || "gpt-image-1";
  const prompt = buildPrompt(opts.pack, opts.skyPolish);

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", `${EDIT_SIZE}x${EDIT_SIZE}`);
  form.append("quality", opts.quality || "medium");
  const bytes = new Uint8Array(squarePng);
  const blob = new Blob([bytes], { type: "image/png" });
  form.append("image[]", blob, "source.png");

  const res = await fetch(OPENAI_IMAGES_EDIT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: form,
  });

  const json = (await res.json()) as {
    data?: Array<{ b64_json?: string; url?: string }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(
      json.error?.message || `OpenAI images/edits failed (${res.status})`
    );
  }

  let squareOut: Buffer;
  const b64 = json.data?.[0]?.b64_json;
  if (b64) {
    squareOut = Buffer.from(b64, "base64");
  } else if (json.data?.[0]?.url) {
    const img = await fetch(json.data[0].url);
    squareOut = Buffer.from(await img.arrayBuffer());
  } else {
    throw new Error("OpenAI returned no image data");
  }

  // Scale crop box if API returns a different square size than EDIT_SIZE
  const outMeta = await sharp(squareOut).metadata();
  const outSide = outMeta.width || EDIT_SIZE;
  const scale = outSide / EDIT_SIZE;
  const scaledContent = {
    left: Math.round(content.left * scale),
    top: Math.round(content.top * scale),
    width: Math.round(content.width * scale),
    height: Math.round(content.height * scale),
  };

  return cropSquareToOriginalAspect(squareOut, scaledContent, original);
}
