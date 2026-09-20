/** Per-angle silhouette guides for the shoot viewfinder (viewBox 0 0 100 100). */

export type GuideKind =
  | "corner"
  | "doorway"
  | "island45"
  | "facade"
  | "center"
  | "window"
  | "path";

export interface GuideSpec {
  kind: GuideKind;
  /** SVG path `d` values drawn as white strokes */
  paths: string[];
  /** Optional dashed secondary paths */
  dashed?: string[];
}

const CORNER: GuideSpec = {
  kind: "corner",
  paths: [
    "M8 40 L8 12 L40 12",
    "M8 12 L42 55",
    "M42 55 L8 88",
    "M8 88 L40 88",
  ],
};

const DOORWAY: GuideSpec = {
  kind: "doorway",
  paths: [
    "M22 88 L22 18 Q22 10 50 10 Q78 10 78 18 L78 88",
    "M22 88 L78 88",
  ],
  dashed: ["M35 88 L35 30 L65 30 L65 88"],
};

const ISLAND45: GuideSpec = {
  kind: "island45",
  paths: [
    "M18 72 L42 38 L82 48 L58 82 Z",
  ],
  dashed: ["M30 20 L70 20", "M50 20 L50 38"],
};

const FACADE: GuideSpec = {
  kind: "facade",
  paths: [
    "M15 78 L15 35 L50 12 L85 35 L85 78 Z",
    "M35 78 L35 48 L50 48 L65 48 L65 78",
  ],
  dashed: ["M15 78 L85 78"],
};

const CENTER: GuideSpec = {
  kind: "center",
  paths: [
    "M25 70 L50 30 L75 70 Z",
  ],
  dashed: ["M20 78 L80 78"],
};

const WINDOW: GuideSpec = {
  kind: "window",
  paths: [
    "M55 20 L88 20 L88 70 L55 70 Z",
    "M55 45 L88 45",
    "M71.5 20 L71.5 70",
  ],
  dashed: ["M12 28 L12 12 L28 12", "M12 72 L12 88 L28 88"],
};

const PATH: GuideSpec = {
  kind: "path",
  paths: [
    "M38 88 L45 40 L55 40 L62 88",
  ],
  dashed: ["M20 30 L80 30"],
};

/** Map coach chip text → guide silhouette */
export function guideForChip(chip: string): GuideSpec {
  const c = chip.toLowerCase();
  if (c.includes("doorway") || c.includes("from doorway")) return DOORWAY;
  if (c.includes("island") || c.includes("45")) return ISLAND45;
  if (c.includes("facade") || c.includes("walkway") || c.includes("centered on"))
    return FACADE;
  if (c.includes("window")) return WINDOW;
  if (c.includes("path") || c.includes("patio") || c.includes("garden"))
    return PATH;
  if (c.includes("center") || c.includes("table") || c.includes("chandelier"))
    return CENTER;
  if (c.includes("corner") || c.includes("back into")) return CORNER;
  return CORNER;
}
