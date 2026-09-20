/**
 * OpenAI Images Edit client for Framewalk pro RE grade.
 * Hard gate: color/tone only — never ask for staging, object removal, or structural change.
 */

import type { RoomType } from "@/types";

const OPENAI_IMAGES_EDIT = "https://api.openai.com/v1/images/edits";

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
    "Preserve the true look of the property. Output must look like a skilled Lightroom pass, not generative AI art.";

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

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string; filename: string } {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) {
    throw new Error("source must be a data URL");
  }
  const contentType = m[1] || "image/jpeg";
  const buffer = Buffer.from(m[2], "base64");
  const ext = contentType.includes("png") ? "png" : "jpg";
  return { buffer, contentType, filename: `source.${ext}` };
}

async function fetchUrlToBuffer(url: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch source image (${res.status})`);
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const ab = await res.arrayBuffer();
  const ext = contentType.includes("png") ? "png" : "jpg";
  return { buffer: Buffer.from(ab), contentType, filename: `source.${ext}` };
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

  const { buffer, contentType, filename } = opts.sourceUrl.startsWith("data:")
    ? dataUrlToBuffer(opts.sourceUrl)
    : await fetchUrlToBuffer(opts.sourceUrl);

  const model = opts.model || process.env.OPENAI_GRADE_MODEL || "gpt-image-1";
  const prompt = buildPrompt(opts.pack, opts.skyPolish);

  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", opts.quality || (opts.pack === "exterior" ? "medium" : "medium"));
  // GPT image models return b64_json by default
  const bytes = new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: contentType });
  form.append("image[]", blob, filename);

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
    throw new Error(json.error?.message || `OpenAI images/edits failed (${res.status})`);
  }

  const b64 = json.data?.[0]?.b64_json;
  if (b64) {
    return `data:image/png;base64,${b64}`;
  }
  const url = json.data?.[0]?.url;
  if (url) {
    const img = await fetch(url);
    const ab = await img.arrayBuffer();
    return `data:image/jpeg;base64,${Buffer.from(ab).toString("base64")}`;
  }
  throw new Error("OpenAI returned no image data");
}
