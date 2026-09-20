import { BURN, batchGradeCost } from "@/data/plans";

export { batchGradeCost, BURN };

export function formatCredits(n: number): string {
  return `${n} credit${n === 1 ? "" : "s"}`;
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatListingPrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function addressSlug(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function flyerFilename(
  address: string,
  templateId: string,
  date = new Date()
): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${addressSlug(address)}_${templateId}_${y}${m}${d}.pdf`;
}
