import { NextRequest, NextResponse } from "next/server";
import type { RoomType } from "@/types";

/**
 * Pro grade job queue stub.
 * When AUTOENHANCE_API_KEY is set, workers will call Autoenhance (see docs/GRADE_MODEL.md).
 * Until then jobs complete with engine: "client-lut-pending" and instruct the client
 * to run the existing clientLutEngine / runGrade path.
 *
 * Hard gate: never request restage / virtual staging from the vendor.
 */

export type GradeJobStatus = "queued" | "running" | "done" | "failed";

export interface GradeJobPhotoIn {
  photoId: string;
  room?: RoomType;
  /** data URL or https URL of original */
  sourceUrl?: string;
}

export interface GradeJobRequest {
  listingId: string;
  mode: "single" | "batch";
  skyPolish?: boolean;
  photos: GradeJobPhotoIn[];
}

export interface GradeJobResultItem {
  photoId: string;
  ok: boolean;
  model: string;
  pack: "interior" | "exterior";
  gradedUrl?: string;
  error?: string;
}

interface GradeJob {
  id: string;
  status: GradeJobStatus;
  createdAt: string;
  updatedAt: string;
  request: GradeJobRequest;
  engine: "autoenhance" | "lut-fallback";
  results?: GradeJobResultItem[];
  error?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __fwGradeJobs: Map<string, GradeJob> | undefined;
}

function jobs(): Map<string, GradeJob> {
  if (!globalThis.__fwGradeJobs) {
    globalThis.__fwGradeJobs = new Map();
  }
  return globalThis.__fwGradeJobs;
}

function uid() {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function packFor(room?: RoomType): "interior" | "exterior" {
  return room === "exterior" || room === "yard" ? "exterior" : "interior";
}

function modelFor(
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

function hasCloudKey() {
  return Boolean(process.env.AUTOENHANCE_API_KEY?.trim());
}

/** Simulate queue hop; cloud path reserved for Autoenhance client. */
async function processJob(job: GradeJob) {
  const store = jobs();
  job.status = "running";
  job.updatedAt = new Date().toISOString();
  store.set(job.id, job);

  await new Promise((r) => setTimeout(r, 400));

  if (job.engine === "autoenhance") {
    // Placeholder until Autoenhance client is wired — fail soft to lut instruction
    job.status = "done";
    job.results = job.request.photos.map((p) => ({
      photoId: p.photoId,
      ok: false,
      model: modelFor(p.room, job.request.mode, !!job.request.skyPolish),
      pack: packFor(p.room),
      error:
        "Autoenhance client not wired yet — set client to runGrade() LUT fallback or retry after implement pass",
    }));
    job.updatedAt = new Date().toISOString();
    store.set(job.id, job);
    return;
  }

  // lut-fallback: tell client to run local engine (keeps demo working without key)
  job.status = "done";
  job.results = job.request.photos.map((p) => ({
    photoId: p.photoId,
    ok: true,
    model: modelFor(p.room, job.request.mode, !!job.request.skyPolish),
    pack: packFor(p.room),
    gradedUrl: undefined,
    error: undefined,
  }));
  job.updatedAt = new Date().toISOString();
  store.set(job.id, job);
}

export async function POST(req: NextRequest) {
  let body: GradeJobRequest;
  try {
    body = (await req.json()) as GradeJobRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body?.listingId || !Array.isArray(body.photos) || body.photos.length === 0) {
    return NextResponse.json(
      { error: "listingId and photos[] required" },
      { status: 400 }
    );
  }

  // Hard gate reminder in API contract
  const skyPolish = Boolean(body.skyPolish);
  const engine = hasCloudKey() ? "autoenhance" : "lut-fallback";

  const job: GradeJob = {
    id: uid(),
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    request: { ...body, skyPolish },
    engine,
  };
  jobs().set(job.id, job);

  // Fire-and-forget stub worker
  void processJob(job);

  return NextResponse.json(
    {
      jobId: job.id,
      status: job.status,
      engine: job.engine,
      policy: {
        structuralEdits: false,
        virtualStaging: false,
        skyPolishOptIn: skyPolish,
        mlsDisclosureRequired: skyPolish,
      },
      hint:
        engine === "lut-fallback"
          ? "No AUTOENHANCE_API_KEY — client should runGrade() via clientLutEngine"
          : "Cloud engine selected — implement Autoenhance upload/download next",
    },
    { status: 202 }
  );
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }
  const job = jobs().get(jobId);
  if (!job) {
    return NextResponse.json({ error: "job not found" }, { status: 404 });
  }
  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    engine: job.engine,
    results: job.results,
    error: job.error,
    updatedAt: job.updatedAt,
  });
}
