/**
 * Stub grade pipeline — replace with LUT + ML refine job queue.
 * Never invents furniture, walls, or amenities.
 */

export type GradeMode = "single" | "batch";

export interface GradeRequest {
  photoIds: string[];
  mode: GradeMode;
  skyPolish?: boolean;
}

export interface GradeResult {
  photoId: string;
  ok: boolean;
  /** Mock: graded derivative key */
  gradedThumbKey: string;
  message?: string;
}

export async function runGrade(req: GradeRequest): Promise<GradeResult[]> {
  // Simulate async model work
  await new Promise((r) => setTimeout(r, 600));
  return req.photoIds.map((photoId) => ({
    photoId,
    ok: true,
    gradedThumbKey: `graded-${photoId}`,
    message: req.skyPolish
      ? "Natural grade + sky polish (disclose on MLS)"
      : "Natural grade applied",
  }));
}
