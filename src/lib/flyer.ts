/**
 * Stub flyer generator — wire LLM copy + PDF layout later.
 */

import { flyerFilename } from "@/lib/credits";
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

export interface FlyerGenerateResult {
  filename: string;
  /** Stub PDF content as text blob for download */
  blob: Blob;
  templateIds: string[];
}

function buildStubPdfText(req: FlyerGenerateRequest, templateId: string): string {
  const { listing, agent, copy } = req;
  return [
    "%PDF-1.4 stub — Framewalk flyer (replace with real PDF renderer)",
    `Template: ${templateId}`,
    `Headline: ${copy.headline}`,
    `Subhead: ${copy.subhead}`,
    `Address: ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
    `Beds/Baths/Sqft: ${listing.beds} / ${listing.baths} / ${listing.sqft}`,
    `Price: ${listing.price}`,
    `Bullets: ${copy.bullets.join(" · ")}`,
    `Agent: ${agent.name} · ${agent.phone} · ${agent.email}`,
    `Brokerage: ${agent.brokerage}`,
    "Equal Housing Opportunity (placeholder)",
    "Brokerage disclosure line (placeholder)",
  ].join("\n");
}

export async function generateFlyer(
  req: FlyerGenerateRequest
): Promise<FlyerGenerateResult> {
  await new Promise((r) => setTimeout(r, 500));

  const ids =
    req.templateId === "open_house_pack"
      ? ["just_listed", "open_house", "feature_sheet"]
      : [req.templateId];

  const parts = ids.map((id) => buildStubPdfText(req, id));
  const text = parts.join("\n\n---\n\n");
  const blob = new Blob([text], { type: "application/pdf" });
  const primary = ids[0];
  const filename = flyerFilename(req.listing.address, primary);

  return { filename, blob, templateIds: ids };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
