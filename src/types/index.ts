export type RoomType =
  | "exterior"
  | "living"
  | "kitchen"
  | "dining"
  | "bedroom"
  | "bathroom"
  | "yard"
  | "other";

export type PhotoFlag = "blur" | "dupe" | "level_ok" | "needs_level";

export type PhotoStatus = "raw" | "selected" | "grading" | "graded" | "rejected";

export interface Photo {
  id: string;
  listingId: string;
  room: RoomType;
  angleLabel: string;
  capturedAt: string;
  status: PhotoStatus;
  flags: PhotoFlag[];
  /** Placeholder gradient / mock image key */
  thumbKey: string;
  gradedThumbKey?: string;
}

export interface Listing {
  id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  status: "draft" | "shooting" | "grading" | "ready" | "marketed";
  createdAt: string;
  heroPhotoId?: string;
  photoIds: string[];
  galleryOrder: string[];
  features: [string, string, string];
}

export type PlanId = "starter" | "pro" | "team";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  creditsMonthly: number;
  capacity: string;
  audience: string;
  stripeProduct: string;
}

export type TopUpId = "boost" | "stack" | "vault";

export interface TopUpPack {
  id: TopUpId;
  name: string;
  credits: number;
  price: number;
  centsPerCredit: number;
  stripeProduct: string;
}

export type LedgerReason =
  | "plan_grant"
  | "topup"
  | "grade"
  | "batch_grade"
  | "hero_upscale"
  | "flyer"
  | "open_house_pack"
  | "sky_polish"
  | "correction";

export interface LedgerEntry {
  id: string;
  delta: number;
  reason: LedgerReason;
  refId?: string;
  createdAt: string;
  note?: string;
}

export type FlyerTemplateId =
  | "just_listed"
  | "open_house"
  | "feature_sheet"
  | "postcard"
  | "door_hanger"
  | "agent_card_sheet";

export interface FlyerTemplate {
  id: FlyerTemplateId;
  name: string;
  use: string;
  orientation: "portrait" | "landscape" | "tall";
  pageSize: string;
  defaultHeadline: string;
  creditCost: number;
}

export interface PrintShop {
  id: string;
  name: string;
  rating?: number;
  distanceMi: number;
  openNow: boolean;
  phone?: string;
  address: string;
  website?: string;
  mapsUrl: string;
}

export interface AgentProfile {
  name: string;
  phone: string;
  email: string;
  brokerage: string;
  accent: string;
}
