/**
 * Structural QA gate for pro grade outputs.
 * Color/tone may change a lot; edge structure must stay close.
 * Fail closed on structural drift (possible staging / object invent).
 */

import sharp from "sharp";

const QA_SIZE = 256;
/** Minimum edge correlation to pass (0–1). Tuned for organic color shifts. */
export const STRUCTURAL_MIN_SCORE = 0.72;

function dataUrlToBuffer(dataUrl: string): Buffer {
  const m = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!m) throw new Error("QA needs data URL");
  return Buffer.from(m[2], "base64");
}

async function lumaEdgeMap(input: Buffer): Promise<Float32Array> {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(QA_SIZE, QA_SIZE, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const src = new Float32Array(w * h);
  for (let i = 0; i < src.length; i++) src[i] = data[i] / 255;

  // Sobel magnitude
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx =
        -src[i - w - 1] +
        src[i - w + 1] -
        2 * src[i - 1] +
        2 * src[i + 1] -
        src[i + w - 1] +
        src[i + w + 1];
      const gy =
        -src[i - w - 1] -
        2 * src[i - w] -
        src[i - w + 1] +
        src[i + w - 1] +
        2 * src[i + w] +
        src[i + w + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function pearson(a: Float32Array, b: Float32Array): number {
  const n = a.length;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  if (den < 1e-9) return 1;
  return Math.max(-1, Math.min(1, num / den));
}

export interface StructuralQaResult {
  pass: boolean;
  score: number;
  detail: string;
}

/**
 * Compare source vs graded. Prefer data URLs (JPEG/PNG).
 * On failure to decode, pass=false (fail closed when cloud returned something unreadable).
 */
export async function structuralQa(
  sourceUrl: string,
  gradedUrl: string
): Promise<StructuralQaResult> {
  try {
    const srcBuf = sourceUrl.startsWith("data:")
      ? dataUrlToBuffer(sourceUrl)
      : Buffer.from(await (await fetch(sourceUrl)).arrayBuffer());
    const grdBuf = gradedUrl.startsWith("data:")
      ? dataUrlToBuffer(gradedUrl)
      : Buffer.from(await (await fetch(gradedUrl)).arrayBuffer());

    const edgeA = await lumaEdgeMap(srcBuf);
    const edgeB = await lumaEdgeMap(grdBuf);
    const corr = pearson(edgeA, edgeB);
    // Map correlation [-1,1] → score [0,1] focused on positive structure match
    // score reported as raw edge correlation
    // Prefer raw corr for threshold — high positive correlation
    const pass = corr >= STRUCTURAL_MIN_SCORE;
    return {
      pass,
      score: Math.round(corr * 1000) / 1000,
      detail: pass
        ? `structural ok (edge corr ${corr.toFixed(3)})`
        : `structural drift (edge corr ${corr.toFixed(3)} < ${STRUCTURAL_MIN_SCORE}) — reject / LUT redo`,
    };
  } catch (e) {
    return {
      pass: false,
      score: 0,
      detail: e instanceof Error ? e.message : "structural QA failed",
    };
  }
}
