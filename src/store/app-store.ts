"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEMO_AGENT, DEMO_LISTING, DEMO_PHOTOS } from "@/data/seed";
import { PLANS, batchGradeCost, BURN } from "@/data/plans";
import type {
  AgentProfile,
  LedgerEntry,
  Listing,
  Photo,
  PlanId,
  RoomType,
} from "@/types";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface AppState {
  agent: AgentProfile;
  planId: PlanId;
  monthlyGrant: number;
  ledger: LedgerEntry[];
  listings: Listing[];
  photos: Photo[];
  softUpsellDismissed: boolean;
  ohPackBoughtFor: string[];

  balance: () => number;
  usageRatio: () => number;
  addLedger: (entry: Omit<LedgerEntry, "id" | "createdAt">) => void;
  canAfford: (cost: number) => boolean;
  burn: (cost: number, reason: LedgerEntry["reason"], refId?: string, note?: string) => boolean;
  topUp: (credits: number, packId: string) => void;
  setPlan: (planId: PlanId) => void;
  dismissSoftUpsell: () => void;

  createListing: (data: {
    address: string;
    city: string;
    state: string;
    zip: string;
    beds: number;
    baths: number;
    sqft: number;
    price: number;
    features?: [string, string, string];
  }) => string;
  getListing: (id: string) => Listing | undefined;
  getPhotos: (listingId: string) => Photo[];
  updateListingStatus: (id: string, status: Listing["status"]) => void;
  setGalleryOrder: (listingId: string, order: string[]) => void;
  addPhoto: (
    listingId: string,
    room: RoomType,
    angleLabel: string,
    opts?: { flags?: Photo["flags"]; dataUrl?: string }
  ) => string;
  togglePhotoSelect: (photoId: string) => void;
  setPhotoFlags: (photoId: string, flags: Photo["flags"]) => void;
  markGraded: (
    photoIds: string[],
    gradedKeys: Record<string, string>,
    extras?: {
      gradedDataUrls?: Record<string, string>;
      models?: Record<string, string>;
      skyPolished?: boolean;
      listingId?: string;
    }
  ) => void;
  /** QA reject: clear grade, return to selected for redo */
  rejectGrade: (photoIds: string[]) => void;
  /** Burn grade + optional sky_polish as separate ledger rows (reserve-first) */
  burnGradeJob: (
    gradeCost: number,
    skyCost: number,
    listingId: string,
    batch: boolean
  ) => boolean;
  /** Refund after failed grade */
  refundGradeJob: (
    gradeCost: number,
    skyCost: number,
    listingId: string,
    note?: string
  ) => void;
  markOhPackBought: (listingId: string) => void;
  gradeCostForSelection: (photoIds: string[], batch: boolean) => number;
  /** Reserve flyer credits before generate */
  burnFlyerJob: (
    cost: number,
    listingId: string,
    pack: boolean,
    note?: string
  ) => boolean;
  /** Refund after failed flyer generate */
  refundFlyerJob: (cost: number, listingId: string, note?: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      agent: DEMO_AGENT,
      planId: "starter",
      monthlyGrant: PLANS.find((p) => p.id === "starter")!.creditsMonthly,
      ledger: [
        {
          id: "led_seed_grant",
          delta: 120,
          reason: "plan_grant",
          createdAt: "2026-09-01T00:00:00.000Z",
          note: "Starter monthly grant",
        },
        {
          id: "led_seed_grade",
          delta: -8,
          reason: "grade",
          refId: "ph_seed",
          createdAt: "2026-09-10T12:00:00.000Z",
          note: "Demo usage so pill shows 112",
        },
      ],
      listings: [DEMO_LISTING],
      photos: DEMO_PHOTOS,
      softUpsellDismissed: false,
      ohPackBoughtFor: [],

      balance: () => get().ledger.reduce((s, e) => s + e.delta, 0),

      usageRatio: () => {
        const grant = get().monthlyGrant;
        if (grant <= 0) return 0;
        const spent = get()
          .ledger.filter((e) => e.delta < 0)
          .reduce((s, e) => s + Math.abs(e.delta), 0);
        // Approximate monthly usage vs grant (MVP: all negative deltas)
        return Math.min(1, spent / grant);
      },

      addLedger: (entry) =>
        set((s) => ({
          ledger: [
            ...s.ledger,
            {
              ...entry,
              id: uid("led"),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      canAfford: (cost) => get().balance() >= cost,

      burn: (cost, reason, refId, note) => {
        if (cost <= 0) return true;
        if (!get().canAfford(cost)) return false;
        get().addLedger({ delta: -cost, reason, refId, note });
        return true;
      },

      topUp: (credits, packId) => {
        get().addLedger({
          delta: credits,
          reason: "topup",
          refId: packId,
          note: `Top-up ${packId}`,
        });
      },

      setPlan: (planId) => {
        const plan = PLANS.find((p) => p.id === planId);
        if (!plan) return;
        set({ planId, monthlyGrant: plan.creditsMonthly, softUpsellDismissed: false });
        get().addLedger({
          delta: plan.creditsMonthly,
          reason: "plan_grant",
          refId: plan.stripeProduct,
          note: `${plan.name} plan grant (stub — Stripe later)`,
        });
      },

      dismissSoftUpsell: () => set({ softUpsellDismissed: true }),

      createListing: (data) => {
        const id = uid("lst");
        const listing: Listing = {
          id,
          ...data,
          status: "draft",
          createdAt: new Date().toISOString(),
          photoIds: [],
          galleryOrder: [],
          features: data.features ?? [
            "Bright primary living spaces",
            "Updated finishes throughout",
            "Prime neighborhood location",
          ],
        };
        set((s) => ({ listings: [listing, ...s.listings] }));
        return id;
      },

      getListing: (id) => get().listings.find((l) => l.id === id),

      getPhotos: (listingId) =>
        get().photos.filter((p) => p.listingId === listingId),

      updateListingStatus: (id, status) =>
        set((s) => ({
          listings: s.listings.map((l) => (l.id === id ? { ...l, status } : l)),
        })),

      setGalleryOrder: (listingId, order) =>
        set((s) => ({
          listings: s.listings.map((l) =>
            l.id === listingId
              ? { ...l, galleryOrder: order, status: "ready" }
              : l
          ),
        })),

      addPhoto: (listingId, room, angleLabel, opts) => {
        const id = uid("ph");
        const photo: Photo = {
          id,
          listingId,
          room,
          angleLabel,
          capturedAt: new Date().toISOString(),
          status: "raw",
          flags: opts?.flags?.length ? opts.flags : ["level_ok"],
          thumbKey: `${room}-${Date.now()}`,
          dataUrl: opts?.dataUrl,
        };
        set((s) => ({
          photos: [...s.photos, photo],
          listings: s.listings.map((l) =>
            l.id === listingId
              ? {
                  ...l,
                  photoIds: [...l.photoIds, id],
                  status: l.status === "draft" ? "shooting" : l.status,
                }
              : l
          ),
        }));
        return id;
      },

      togglePhotoSelect: (photoId) =>
        set((s) => ({
          photos: s.photos.map((p) => {
            if (p.id !== photoId) return p;
            if (p.status === "graded") return p;
            const next =
              p.status === "selected" ? "raw" : ("selected" as const);
            return { ...p, status: next };
          }),
        })),

      setPhotoFlags: (photoId, flags) =>
        set((s) => ({
          photos: s.photos.map((p) => (p.id === photoId ? { ...p, flags } : p)),
        })),

      markGraded: (photoIds, gradedKeys, extras) =>
        set((s) => ({
          photos: s.photos.map((p) =>
            photoIds.includes(p.id)
              ? {
                  ...p,
                  status: "graded" as const,
                  gradedThumbKey: gradedKeys[p.id] ?? `graded-${p.id}`,
                  gradedDataUrl:
                    extras?.gradedDataUrls?.[p.id] ?? p.gradedDataUrl,
                  gradeModel: extras?.models?.[p.id] ?? p.gradeModel,
                  skyPolished: extras?.skyPolished
                    ? true
                    : extras?.skyPolished === false
                      ? false
                      : p.skyPolished,
                }
              : p
          ),
          listings: s.listings.map((l) => {
            const touched = photoIds.some((id) => l.photoIds.includes(id));
            if (!touched) return l;
            const next = {
              ...l,
              status:
                l.status !== "ready" && l.status !== "marketed"
                  ? ("grading" as const)
                  : l.status,
              mlsDisclosure:
                extras?.skyPolished || l.mlsDisclosure
                  ? true
                  : l.mlsDisclosure,
            };
            return next;
          }),
        })),

      rejectGrade: (photoIds) =>
        set((s) => ({
          photos: s.photos.map((p) =>
            photoIds.includes(p.id)
              ? {
                  ...p,
                  status: "selected" as const,
                  gradedThumbKey: undefined,
                  gradedDataUrl: undefined,
                  gradeModel: undefined,
                  skyPolished: undefined,
                }
              : p
          ),
        })),

      burnGradeJob: (gradeCost, skyCost, listingId, batch) => {
        const total = gradeCost + skyCost;
        if (total <= 0) return true;
        if (!get().canAfford(total)) return false;
        if (gradeCost > 0) {
          get().addLedger({
            delta: -gradeCost,
            reason: batch ? "batch_grade" : "grade",
            refId: listingId,
            note: batch ? "batch natural grade" : "natural grade",
          });
        }
        if (skyCost > 0) {
          get().addLedger({
            delta: -skyCost,
            reason: "sky_polish",
            refId: listingId,
            note: "sky polish (MLS disclose)",
          });
        }
        return true;
      },

      refundGradeJob: (gradeCost, skyCost, listingId, note) => {
        const total = gradeCost + skyCost;
        if (total <= 0) return;
        get().addLedger({
          delta: total,
          reason: "correction",
          refId: listingId,
          note: note ?? "grade failed — refund",
        });
      },

      markOhPackBought: (listingId) =>
        set((s) => ({
          ohPackBoughtFor: s.ohPackBoughtFor.includes(listingId)
            ? s.ohPackBoughtFor
            : [...s.ohPackBoughtFor, listingId],
        })),

      gradeCostForSelection: (photoIds, batch) => {
        if (!batch) return photoIds.length * BURN.grade;
        return batchGradeCost(photoIds.length);
      },

      burnFlyerJob: (cost, listingId, pack, note) => {
        if (cost <= 0) return true;
        if (!get().canAfford(cost)) return false;
        get().addLedger({
          delta: -cost,
          reason: pack ? "open_house_pack" : "flyer",
          refId: listingId,
          note: note ?? (pack ? "open-house pack" : "flyer generate"),
        });
        return true;
      },

      refundFlyerJob: (cost, listingId, note) => {
        if (cost <= 0) return;
        get().addLedger({
          delta: cost,
          reason: "correction",
          refId: listingId,
          note: note ?? "flyer failed — refund",
        });
      },
    }),
    {
      name: "framewalk-mvp",
      partialize: (s) => ({
        agent: s.agent,
        planId: s.planId,
        monthlyGrant: s.monthlyGrant,
        ledger: s.ledger,
        listings: s.listings,
        // Drop data URLs — they blow iOS Safari localStorage quota and crash persist writes
        photos: s.photos.map((ph) => {
          const rest = { ...ph };
          delete rest.dataUrl;
          delete rest.gradedDataUrl;
          return rest;
        }),
        softUpsellDismissed: s.softUpsellDismissed,
        ohPackBoughtFor: s.ohPackBoughtFor,
      }),
    }
  )
);
