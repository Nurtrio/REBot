import { NextRequest, NextResponse } from "next/server";
import type { RoomType } from "@/types";
import {
  enhanceWithOpenAI,
  modelIdFor,
  packForRoom,
} from "@/lib/openai-grade";

/**
 * Pro grade job queue.
 * When OPENAI_API_KEY is set → OpenAI Images Edit (gpt-image-*) with staging hard-off prompt.
 * Else → lut-fallback (client runs canvas LUT).
 */

export type GradeJobStatus = "queued" | "running" | "done" | "failed";

export interface GradeJobPhotoIn {
  photoId: string;
  room?: RoomType;
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
  engine: "openai" | "lut-fallback";
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

function hasOpenAIKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function processJob(job: GradeJob) {
  const store = jobs();
  job.status = "running";
  job.updatedAt = new Date().toISOString();
  store.set(job.id, job);

  try {
    if (job.engine === "openai") {
      const apiKey = process.env.OPENAI_API_KEY!.trim();
      const quality =
        job.request.mode === "batch"
          ? ("low" as const)
          : ("medium" as const);

      const results: GradeJobResultItem[] = [];
      for (const p of job.request.photos) {
        const pack = packForRoom(p.room);
        const model = modelIdFor(
          p.room,
          job.request.mode,
          !!job.request.skyPolish
        );
        try {
          const gradedUrl = await enhanceWithOpenAI({
            apiKey,
            sourceUrl: p.sourceUrl,
            pack,
            skyPolish: !!job.request.skyPolish,
            quality,
          });
          results.push({
            photoId: p.photoId,
            ok: true,
            model,
            pack,
            gradedUrl,
          });
        } catch (e) {
          results.push({
            photoId: p.photoId,
            ok: false,
            model,
            pack,
            error: e instanceof Error ? e.message : "enhance failed",
          });
        }
      }
      job.results = results;
      job.status = results.some((r) => r.ok) ? "done" : "failed";
      if (job.status === "failed") {
        job.error = "All OpenAI grade jobs failed";
      }
    } else {
      // Client should run LUT — mark ok without gradedUrl
      job.results = job.request.photos.map((p) => ({
        photoId: p.photoId,
        ok: true,
        model: modelIdFor(p.room, job.request.mode, !!job.request.skyPolish),
        pack: packForRoom(p.room),
      }));
      job.status = "done";
    }
  } catch (e) {
    job.status = "failed";
    job.error = e instanceof Error ? e.message : "job failed";
  }

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

  const skyPolish = Boolean(body.skyPolish);
  const engine = hasOpenAIKey() ? "openai" : "lut-fallback";

  const job: GradeJob = {
    id: uid(),
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    request: { ...body, skyPolish },
    engine,
  };
  jobs().set(job.id, job);
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
        provider: engine === "openai" ? "openai-images-edits" : "client-lut",
      },
      hint:
        engine === "lut-fallback"
          ? "No OPENAI_API_KEY — client should runGrade() via clientLutEngine"
          : "OpenAI Images Edit — polling GET /api/grade?jobId=",
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
