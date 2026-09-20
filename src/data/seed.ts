import type { AgentProfile, Listing, Photo, PrintShop } from "@/types";

export const DEMO_AGENT: AgentProfile = {
  name: "Maya Chen",
  phone: "(310) 555-0142",
  email: "maya@chenrealty.com",
  brokerage: "Chen Realty Group",
  accent: "#C45C26",
};

export const DEMO_LISTING: Listing = {
  id: "lst_demo_pacific",
  address: "742 Pacific Crest Drive",
  city: "Santa Monica",
  state: "CA",
  zip: "90402",
  beds: 4,
  baths: 3,
  sqft: 2480,
  price: 2_185_000,
  status: "shooting",
  createdAt: "2026-09-18T16:00:00.000Z",
  heroPhotoId: "ph_01",
  photoIds: [
    "ph_01",
    "ph_02",
    "ph_03",
    "ph_04",
    "ph_05",
    "ph_06",
    "ph_07",
    "ph_08",
    "ph_09",
    "ph_10",
    "ph_11",
    "ph_12",
  ],
  galleryOrder: [],
  features: [
    "Ocean-breeze living room with oak floors",
    "Chef’s kitchen, quartz + induction",
    "Primary suite with private balcony",
  ],
};

const rooms: Array<{
  id: string;
  room: Photo["room"];
  angle: string;
  flags: Photo["flags"];
  status: Photo["status"];
}> = [
  { id: "ph_01", room: "exterior", angle: "Front elevation", flags: ["level_ok"], status: "selected" },
  { id: "ph_02", room: "exterior", angle: "Driveway approach", flags: ["dupe"], status: "raw" },
  { id: "ph_03", room: "living", angle: "Corner wide", flags: ["level_ok"], status: "selected" },
  { id: "ph_04", room: "living", angle: "Fireplace detail", flags: ["blur"], status: "raw" },
  { id: "ph_05", room: "kitchen", angle: "Island 45°", flags: ["level_ok"], status: "selected" },
  { id: "ph_06", room: "kitchen", angle: "Doorway frame", flags: ["level_ok"], status: "selected" },
  { id: "ph_07", room: "dining", angle: "Table center", flags: ["needs_level"], status: "raw" },
  { id: "ph_08", room: "bedroom", angle: "Primary corner", flags: ["level_ok"], status: "selected" },
  { id: "ph_09", room: "bedroom", angle: "Guest window", flags: ["level_ok"], status: "selected" },
  { id: "ph_10", room: "bathroom", angle: "Vanity mirror", flags: ["level_ok"], status: "selected" },
  { id: "ph_11", room: "yard", angle: "Patio wide", flags: ["level_ok"], status: "selected" },
  { id: "ph_12", room: "yard", angle: "Garden path", flags: ["dupe"], status: "raw" },
];

export const DEMO_PHOTOS: Photo[] = rooms.map((r, i) => ({
  id: r.id,
  listingId: DEMO_LISTING.id,
  room: r.room,
  angleLabel: r.angle,
  capturedAt: new Date(Date.UTC(2026, 8, 18, 17, i * 3)).toISOString(),
  status: r.status,
  flags: r.flags,
  thumbKey: `${r.room}-${i}`,
}));

/** Mock shops for ZIP when Places key is absent — clearly labeled as demo fixtures */
export const DEMO_PRINT_SHOPS: PrintShop[] = [
  {
    id: "shop_demo_1",
    name: "Pacific Print & Copy (demo)",
    rating: 4.7,
    distanceMi: 1.2,
    openNow: true,
    phone: "(310) 555-0190",
    address: "1200 Montana Ave, Santa Monica, CA 90403",
    website: "https://example.com/pacific-print",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=print+shop+near+90402",
  },
  {
    id: "shop_demo_2",
    name: "Crest FedEx Office (demo)",
    rating: 4.3,
    distanceMi: 2.4,
    openNow: true,
    phone: "(310) 555-0118",
    address: "2920 Lincoln Blvd, Santa Monica, CA 90405",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=FedEx+Office+near+90402",
  },
  {
    id: "shop_demo_3",
    name: "Canyon UPS Store (demo)",
    rating: 4.1,
    distanceMi: 3.8,
    openNow: false,
    phone: "(310) 555-0166",
    address: "2001 Wilshire Blvd, Santa Monica, CA 90403",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=UPS+Store+near+90402",
  },
];

export const ROOM_COACH: Record<
  string,
  { label: string; chips: string[] }
> = {
  exterior: {
    label: "Exterior",
    chips: ["Stand centered on the facade", "Include walkway in frame", "Keep verticals straight"],
  },
  living: {
    label: "Living",
    chips: ["Go to the corner of the room", "Shoot across the seating", "Include a window edge"],
  },
  kitchen: {
    label: "Kitchen",
    chips: ["Island at 45°", "Doorway frame the counters", "Back into the corner"],
  },
  dining: {
    label: "Dining",
    chips: ["Center the table", "Capture chandelier height", "Leave negative space above"],
  },
  bedroom: {
    label: "Bedroom",
    chips: ["Corner wide for depth", "Window light at side", "Keep bed aligned"],
  },
  bathroom: {
    label: "Bath",
    chips: ["Shoot from doorway", "Mirror without selfie", "Level the tile lines"],
  },
  yard: {
    label: "Yard",
    chips: ["Patio as hero plane", "Garden path leading in", "Hold horizon level"],
  },
  other: {
    label: "Other",
    chips: ["Find a corner", "Keep horizon level", "One clear subject"],
  },
};

export const ROOM_ORDER = [
  "exterior",
  "living",
  "kitchen",
  "dining",
  "bedroom",
  "bathroom",
  "yard",
  "other",
] as const;
