/**
 * Flyer generator — canvas layout → JPEG-in-PDF (print-ready stub).
 * Listing facts + agent only; no invented amenities.
 */

import { flyerFilename } from "@/lib/credits";
import { FLYER_TEMPLATES, OPEN_HOUSE_PACK_IDS } from "@/data/plans";
import type { FlyerTemplateId, Listing, AgentProfile } from "@/types";

export interface FlyerCopy {
  headline: string;
  subhead: string;
  bullets: [string, string, string];
  showingTime?: string;
  url?: string;
}

export interface FlyerGenerateRequest {
  templateId: FlyerTemplateId | "open_house_pack";
  listing: Listing;
  agent: AgentProfile;
  copy: FlyerCopy;
}

export interface FlyerFile {
  templateId: string;
  filename: string;
  blob: Blob;
}

export interface FlyerGenerateResult {
  files: FlyerFile[];
  templateIds: string[];
}

/** CSS aspect / layout hint for live preview */
export function previewLayout(
  templateId: FlyerTemplateId | "open_house_pack"
): {
  aspectClass: string;
  label: string;
  pack?: boolean;
} {
  if (templateId === "open_house_pack") {
    return {
      aspectClass: "aspect-[3/4] max-h-56",
      label: "Pack preview (3 flyers)",
      pack: true,
    };
  }
  const t = FLYER_TEMPLATES.find((x) => x.id === templateId);
  switch (t?.orientation) {
    case "landscape":
      return { aspectClass: "aspect-[9/6] max-h-44", label: t.name };
    case "tall":
      return { aspectClass: "aspect-[9/16] max-h-64 w-40 mx-auto", label: t.name };
    default:
      return { aspectClass: "aspect-[3/4] max-h-56", label: t?.name ?? "Flyer" };
  }
}

/** PDF page size in points (72 dpi) */
function pageSizePts(templateId: string): { w: number; h: number } {
  switch (templateId) {
    case "postcard":
      return { w: 432, h: 648 }; // 6×9
    case "door_hanger":
      return { w: 306, h: 792 }; // half-letter tall
    default:
      return { w: 612, h: 792 }; // letter
  }
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (ctx.measureText(trial).width <= maxWidth) {
      line = trial;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawFlyerCanvas(
  templateId: string,
  listing: Listing,
  agent: AgentProfile,
  copy: FlyerCopy
): HTMLCanvasElement {
  const { w: pdfW, h: pdfH } = pageSizePts(templateId);
  const scale = 2; // ~144 dpi effective
  const W = Math.round(pdfW * scale);
  const H = Math.round(pdfH * scale);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Paper
  ctx.fillStyle = "#F7F4EF";
  ctx.fillRect(0, 0, W, H);

  // Hero band
  const heroH = templateId === "postcard" ? H * 0.42 : H * 0.36;
  ctx.fillStyle = "#1a1814";
  ctx.fillRect(0, 0, W, heroH);
  ctx.fillStyle = agent.accent;
  ctx.fillRect(0, heroH - 6 * scale, W, 6 * scale);

  const pad = 36 * scale;
  const meta = FLYER_TEMPLATES.find((t) => t.id === templateId);
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = `${11 * scale}px system-ui, sans-serif`;
  ctx.fillText((meta?.name ?? templateId).toUpperCase(), pad, pad + 8 * scale);

  ctx.fillStyle = "#F7F4EF";
  ctx.font = `600 ${Math.round(28 * scale)}px Georgia, "Times New Roman", serif`;
  const headLines = wrapLines(ctx, copy.headline, W - pad * 2);
  let y = pad + 48 * scale;
  for (const ln of headLines.slice(0, 3)) {
    ctx.fillText(ln, pad, y);
    y += 34 * scale;
  }

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = `${16 * scale}px system-ui, sans-serif`;
  ctx.fillText(copy.subhead, pad, y + 8 * scale);

  // Body
  let bodyY = heroH + pad;
  ctx.fillStyle = "#1a1814";
  ctx.font = `600 ${15 * scale}px system-ui, sans-serif`;
  ctx.fillText(listing.address, pad, bodyY);
  bodyY += 22 * scale;
  ctx.fillStyle = "#5c574e";
  ctx.font = `${13 * scale}px system-ui, sans-serif`;
  ctx.fillText(
    `${listing.city}, ${listing.state} ${listing.zip}`,
    pad,
    bodyY
  );
  bodyY += 28 * scale;
  ctx.fillText(
    `${listing.beds} bd · ${listing.baths} ba · ${listing.sqft.toLocaleString()} sf`,
    pad,
    bodyY
  );
  bodyY += 36 * scale;

  ctx.fillStyle = "#1a1814";
  ctx.font = `${14 * scale}px system-ui, sans-serif`;
  for (const b of copy.bullets.filter(Boolean)) {
    const lines = wrapLines(ctx, `· ${b}`, W - pad * 2);
    for (const ln of lines) {
      ctx.fillText(ln, pad, bodyY);
      bodyY += 20 * scale;
    }
    bodyY += 4 * scale;
  }

  if (copy.showingTime && (templateId === "open_house" || templateId === "just_listed")) {
    bodyY += 12 * scale;
    ctx.fillStyle = agent.accent;
    ctx.font = `600 ${14 * scale}px system-ui, sans-serif`;
    ctx.fillText(copy.showingTime, pad, bodyY);
  }

  // Agent footer
  const footY = H - pad;
  ctx.fillStyle = "#5c574e";
  ctx.font = `${12 * scale}px system-ui, sans-serif`;
  ctx.fillText(`${agent.name} · ${agent.phone}`, pad, footY - 36 * scale);
  ctx.fillText(`${agent.email} · ${agent.brokerage}`, pad, footY - 18 * scale);
  ctx.fillStyle = "#8a847a";
  ctx.font = `${10 * scale}px system-ui, sans-serif`;
  ctx.fillText(
    "Equal Housing Opportunity · Brokerage disclosure on file",
    pad,
    footY
  );

  return canvas;
}

/** Minimal PDF with one embedded JPEG image covering the page */
async function canvasToPdfBlob(
  canvas: HTMLCanvasElement,
  pageW: number,
  pageH: number
): Promise<Blob> {
  const jpeg = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("JPEG encode failed"))),
      "image/jpeg",
      0.92
    );
  });
  const jpegBytes = new Uint8Array(await jpeg.arrayBuffer());

  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;

  const push = (s: string | Uint8Array) => {
    const bytes = typeof s === "string" ? encoder.encode(s) : s;
    parts.push(bytes);
    pos += bytes.length;
  };

  const startObj = (n: number) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n`);
  };
  const endObj = () => push("\nendobj\n");

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  // 1 Catalog
  startObj(1);
  push("<< /Type /Catalog /Pages 2 0 R >>");
  endObj();

  // 2 Pages
  startObj(2);
  push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  endObj();

  // 3 Page
  startObj(3);
  push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /XObject << /Im0 5 0 R >> >> >>`
  );
  endObj();

  // 4 Content stream — draw image full page
  const content = `q ${pageW} 0 0 ${pageH} 0 0 cm /Im0 Do Q\n`;
  startObj(4);
  push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);
  endObj();

  // 5 Image XObject
  startObj(5);
  push(
    `<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  push(jpegBytes);
  push("\nendstream");
  endObj();

  const xrefPos = pos;
  const objCount = 5;
  push(`xref\n0 ${objCount + 1}\n`);
  push("0000000000 65535 f \n");
  for (let i = 1; i <= objCount; i++) {
    push(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objCount + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
  );

  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return new Blob([out], { type: "application/pdf" });
}

export async function generateFlyer(
  req: FlyerGenerateRequest
): Promise<FlyerGenerateResult> {
  const ids =
    req.templateId === "open_house_pack"
      ? [...OPEN_HOUSE_PACK_IDS]
      : [req.templateId];

  const files: FlyerFile[] = [];
  for (const id of ids) {
    const meta = FLYER_TEMPLATES.find((t) => t.id === id);
    const copy: FlyerCopy = {
      ...req.copy,
      headline:
        req.templateId === "open_house_pack"
          ? meta?.defaultHeadline ?? req.copy.headline
          : req.copy.headline,
    };
    const canvas = drawFlyerCanvas(id, req.listing, req.agent, copy);
    const { w, h } = pageSizePts(id);
    const blob = await canvasToPdfBlob(canvas, w, h);
    files.push({
      templateId: id,
      filename: flyerFilename(req.listing.address, id),
      blob,
    });
  }

  return { files, templateIds: [...ids] };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function canShareFiles(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined") return false;
  if (!navigator.share || !navigator.canShare) return false;
  try {
    const probe = new File([new Blob(["x"], { type: "application/pdf" })], "probe.pdf", {
      type: "application/pdf",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export type FlyerDeliverMode = "share" | "download";

/** Prefer iOS/Android share sheet when File sharing is supported; else download. */
export async function deliverFlyerResult(
  result: FlyerGenerateResult,
  preferShare = true
): Promise<FlyerDeliverMode> {
  const files = result.files.map(
    (f) =>
      new File([f.blob], f.filename, {
        type: "application/pdf",
        lastModified: Date.now(),
      })
  );

  if (preferShare && canShareFiles()) {
    try {
      await navigator.share({
        files,
        title: "Framewalk flyer",
        text:
          files.length > 1
            ? "Open-house flyer pack from Framewalk"
            : "Listing flyer from Framewalk",
      });
      return "share";
    } catch (err) {
      // User cancel — don't fall through to download spam
      if (err instanceof DOMException && err.name === "AbortError") {
        return "share";
      }
      // Share failed (e.g. too many files) — fall through
    }
  }

  for (let i = 0; i < result.files.length; i++) {
    const f = result.files[i];
    downloadBlob(f.blob, f.filename);
    if (i < result.files.length - 1) {
      await new Promise((r) => setTimeout(r, 280));
    }
  }
  return "download";
}

/** @deprecated use deliverFlyerResult */
export async function downloadFlyerResult(result: FlyerGenerateResult) {
  await deliverFlyerResult(result, false);
}
