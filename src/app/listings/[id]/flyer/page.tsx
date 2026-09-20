"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ScreenHeader,
  Button,
  CreditPill,
  ConfirmCost,
  SectionLabel,
} from "@/components/ui";
import { FLYER_TEMPLATES, BURN, OPEN_HOUSE_PACK_IDS } from "@/data/plans";
import { useAppStore } from "@/store/app-store";
import { formatListingPrice } from "@/lib/credits";
import { downloadBlob, generateFlyer } from "@/lib/flyer";
import type { FlyerTemplateId } from "@/types";

export default function FlyerPage() {
  const params = useParams();
  const id = params.id as string;
  const listing = useAppStore((s) => s.getListing(id));
  const agent = useAppStore((s) => s.agent);
  const balance = useAppStore((s) => s.balance());
  const canAfford = useAppStore((s) => s.canAfford);
  const burn = useAppStore((s) => s.burn);
  const ohBought = useAppStore((s) => s.ohPackBoughtFor);
  const markOh = useAppStore((s) => s.markOhPackBought);

  const [templateId, setTemplateId] = useState<
    FlyerTemplateId | "open_house_pack"
  >("just_listed");
  const [headline, setHeadline] = useState("Just Listed");
  const [subhead, setSubhead] = useState("");
  const [bullets, setBullets] = useState<[string, string, string]>([
    "",
    "",
    "",
  ]);
  const [showing, setShowing] = useState("Saturday 1–4pm");
  const [busy, setBusy] = useState(false);
  const [showOhUpsell, setShowOhUpsell] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const template = FLYER_TEMPLATES.find((t) => t.id === templateId);
  const cost =
    templateId === "open_house_pack" ? BURN.openHousePack : BURN.flyer;

  useEffect(() => {
    if (listing) {
      setSubhead(formatListingPrice(listing.price));
      setBullets(listing.features);
    }
  }, [listing]);

  if (!listing) {
    return (
      <main>
        <ScreenHeader title="Flyer" backHref="/" />
        <p className="px-4 py-8 text-sm text-muted">Listing not found.</p>
      </main>
    );
  }

  const field =
    "w-full rounded-fw-sm border border-line bg-paper-raised px-3 py-2 text-sm outline-none focus:border-ink/40";

  async function onGenerate() {
    setMsg(null);
    if (!listing) return;
    const current = listing;
    if (!canAfford(cost)) {
      setMsg("Out of credits. Top up to generate.");
      return;
    }
    setBusy(true);
    try {
      const result = await generateFlyer({
        templateId,
        listing: current,
        agent,
        copy: {
          headline:
            templateId === "open_house_pack"
              ? "Open House Pack"
              : headline || template?.defaultHeadline || "Just Listed",
          subhead: subhead || formatListingPrice(current.price),
          bullets: [
            bullets[0] || current.features[0],
            bullets[1] || current.features[1],
            bullets[2] || current.features[2],
          ],
          showingTime: showing,
        },
      });
      const reason =
        templateId === "open_house_pack" ? "open_house_pack" : "flyer";
      const ok = burn(cost, reason, id, templateId);
      if (!ok) {
        setMsg("Could not burn credits.");
        return;
      }
      if (templateId === "open_house_pack") markOh(id);
      downloadBlob(result.blob, result.filename);
      setMsg(`Downloaded ${result.filename} (PDF stub).`);
      if (templateId !== "open_house_pack" && !ohBought.includes(id)) {
        setShowOhUpsell(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <ScreenHeader
        title="Flyer builder"
        subtitle="Editorial templates · listing facts only"
        backHref={`/listings/${id}`}
        right={<CreditPill balance={balance} />}
      />

      <div className="space-y-5 px-4 py-4">
        <div>
          <SectionLabel>Template</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {FLYER_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTemplateId(t.id);
                  setHeadline(t.defaultHeadline);
                }}
                className={`rounded-fw border px-3 py-2.5 text-left ${
                  templateId === t.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line bg-paper-raised"
                }`}
              >
                <p className="text-sm font-medium">{t.name}</p>
                <p
                  className={`text-[10px] ${
                    templateId === t.id ? "text-white/60" : "text-faint"
                  }`}
                >
                  {t.use} · {t.pageSize}
                </p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setTemplateId("open_house_pack");
                setHeadline("Open House Pack");
              }}
              className={`col-span-2 rounded-fw border px-3 py-2.5 text-left ${
                templateId === "open_house_pack"
                  ? "border-ink bg-ink text-paper"
                  : "border-accent/30 bg-accent-soft"
              }`}
            >
              <p className="text-sm font-medium">Open-house pack</p>
              <p className="text-[10px] opacity-70">
                {OPEN_HOUSE_PACK_IDS.join(" + ")} · 18 credits (save 6)
              </p>
            </button>
          </div>
        </div>

        <div className="fw-card overflow-hidden">
          <div
            className="aspect-[3/4] max-h-56 bg-gradient-to-b from-[#2c2822] to-[#1a1814] p-5 text-paper"
            style={{ borderBottom: `3px solid ${agent.accent}` }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">
              {templateId === "open_house_pack"
                ? "Pack preview"
                : template?.name}
            </p>
            <p className="mt-4 font-display text-2xl leading-tight">
              {headline || "Headline"}
            </p>
            <p className="mt-2 text-sm text-white/70">
              {subhead || formatListingPrice(listing.price)}
            </p>
            <p className="mt-6 text-xs text-white/50">{listing.address}</p>
            <ul className="mt-3 space-y-1 text-xs text-white/65">
              {(bullets[0] ? bullets : listing.features).map((b) => (
                <li key={b}>· {b}</li>
              ))}
            </ul>
            <p className="mt-auto pt-8 text-[10px] text-white/40">
              {agent.name} · {agent.brokerage}
            </p>
          </div>
        </div>

        <div>
          <SectionLabel>Copy</SectionLabel>
          <div className="space-y-2">
            <input
              className={field}
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Headline"
            />
            <input
              className={field}
              value={subhead}
              onChange={(e) => setSubhead(e.target.value)}
              placeholder="Subhead / price"
            />
            {([0, 1, 2] as const).map((i) => (
              <input
                key={i}
                className={field}
                value={bullets[i]}
                onChange={(e) => {
                  const next = [...bullets] as [string, string, string];
                  next[i] = e.target.value;
                  setBullets(next);
                }}
                placeholder={`Feature ${i + 1}`}
              />
            ))}
            <input
              className={field}
              value={showing}
              onChange={(e) => setShowing(e.target.value)}
              placeholder="Showing time (optional)"
            />
          </div>
        </div>

        <ConfirmCost cost={cost} balance={balance} />

        {msg ? <p className="text-sm text-level">{msg}</p> : null}

        {!canAfford(cost) ? (
          <div className="rounded-fw border border-danger/25 bg-danger-soft px-3 py-3 text-sm text-danger">
            Out of credits.{" "}
            <Link href="/billing" className="font-medium underline">
              Top up 150
            </Link>
          </div>
        ) : (
          <Button size="lg" disabled={busy} onClick={onGenerate}>
            {busy ? "Generating…" : `Generate PDF · ${cost} credits`}
          </Button>
        )}

        {showOhUpsell ? (
          <div className="rounded-fw border border-accent/25 bg-accent-soft px-3 py-3 text-sm">
            Nice. Want the open-house pack (3 flyers) for 18 credits?
            <button
              type="button"
              className="mt-2 block font-medium text-accent"
              onClick={() => {
                setTemplateId("open_house_pack");
                setShowOhUpsell(false);
              }}
            >
              Make the open-house set
            </button>
          </div>
        ) : null}

        <Link href={`/listings/${id}/print`}>
          <Button variant="secondary" size="lg" className="mt-1">
            Find print shops
          </Button>
        </Link>

        <p className="text-center text-[10px] text-faint">
          Equal Housing mark + brokerage disclosure on every PDF.
        </p>
      </div>
    </main>
  );
}
