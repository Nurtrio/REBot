import type { FlyerTemplate, Plan, TopUpPack } from "@/types";

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 29,
    creditsMonthly: 120,
    capacity: "~1–2 listings (30–40 graded shots)",
    audience: "Solo agents dipping in",
    stripeProduct: "fw_starter",
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 59,
    creditsMonthly: 350,
    capacity: "~4–6 listings",
    audience: "Active listers",
    stripeProduct: "fw_pro",
  },
  {
    id: "team",
    name: "Team",
    priceMonthly: 129,
    creditsMonthly: 900,
    capacity: "Brokerage / assistants",
    audience: "Shared seat, one ledger per workspace",
    stripeProduct: "fw_team",
  },
];

export const TOP_UPS: TopUpPack[] = [
  {
    id: "boost",
    name: "Boost",
    credits: 50,
    price: 12,
    centsPerCredit: 24,
    stripeProduct: "fw_topup_50",
  },
  {
    id: "stack",
    name: "Stack",
    credits: 150,
    price: 29,
    centsPerCredit: 19,
    stripeProduct: "fw_topup_150",
  },
  {
    id: "vault",
    name: "Vault",
    credits: 400,
    price: 69,
    centsPerCredit: 17,
    stripeProduct: "fw_topup_400",
  },
];

export const BURN = {
  grade: 1,
  batchAfterFirst10: 0.8,
  heroUpscale: 2,
  flyer: 8,
  openHousePack: 18,
  skyPolish: 2,
} as const;

export const FLYER_TEMPLATES: FlyerTemplate[] = [
  {
    id: "just_listed",
    name: "Just Listed",
    use: "Launch day",
    orientation: "portrait",
    pageSize: "Letter",
    defaultHeadline: "Just Listed",
    creditCost: BURN.flyer,
  },
  {
    id: "open_house",
    name: "Open House",
    use: "Weekend OH",
    orientation: "portrait",
    pageSize: "Letter",
    defaultHeadline: "Open House Saturday",
    creditCost: BURN.flyer,
  },
  {
    id: "feature_sheet",
    name: "Feature Sheet",
    use: "Full facts",
    orientation: "portrait",
    pageSize: "Letter",
    defaultHeadline: "Property Highlights",
    creditCost: BURN.flyer,
  },
  {
    id: "postcard",
    name: "Postcard",
    use: "Mail / door drop",
    orientation: "landscape",
    pageSize: "6×9",
    defaultHeadline: "Now Available",
    creditCost: BURN.flyer,
  },
  {
    id: "door_hanger",
    name: "Door Hanger",
    use: "Neighborhood",
    orientation: "tall",
    pageSize: "Half-letter",
    defaultHeadline: "New on Your Block",
    creditCost: BURN.flyer,
  },
  {
    id: "agent_card_sheet",
    name: "Agent + Gallery",
    use: "Leave-behind",
    orientation: "portrait",
    pageSize: "Letter",
    defaultHeadline: "Presented by",
    creditCost: BURN.flyer,
  },
];

export const OPEN_HOUSE_PACK_IDS = [
  "just_listed",
  "open_house",
  "feature_sheet",
] as const;

/** Batch grade cost: first 10 @ 1.0, remainder @ 0.8, round up */
export function batchGradeCost(count: number): number {
  if (count <= 0) return 0;
  if (count <= 10) return count;
  const remainder = count - 10;
  return Math.ceil(10 + remainder * BURN.batchAfterFirst10);
}
