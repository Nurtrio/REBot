"use client";

import { ScreenHeader, Button, SectionLabel } from "@/components/ui";
import { PLANS, TOP_UPS } from "@/data/plans";
import { formatPrice } from "@/lib/credits";
import { useAppStore } from "@/store/app-store";
import type { PlanId } from "@/types";

export default function BillingPage() {
  const balance = useAppStore((s) => s.balance());
  const planId = useAppStore((s) => s.planId);
  const ledger = useAppStore((s) => s.ledger);
  const setPlan = useAppStore((s) => s.setPlan);
  const topUp = useAppStore((s) => s.topUp);
  const usageRatio = useAppStore((s) => s.usageRatio());
  const softUpsellDismissed = useAppStore((s) => s.softUpsellDismissed);
  const dismissSoftUpsell = useAppStore((s) => s.dismissSoftUpsell);

  const plan = PLANS.find((p) => p.id === planId)!;
  const usagePct = Math.min(100, Math.round(usageRatio * 100));
  const showSoftUpsell = usageRatio >= 0.8 && !softUpsellDismissed;
  const nextPlan =
    planId === "starter"
      ? PLANS.find((p) => p.id === "pro")
      : planId === "pro"
        ? PLANS.find((p) => p.id === "team")
        : null;
  const suggestTopUp = TOP_UPS.find((t) => t.id === "stack")!;

  function upgrade(next: PlanId) {
    if (next === planId) return;
    setPlan(next);
  }

  return (
    <main>
      <ScreenHeader title="Billing" subtitle="Credits · plans · top-ups" backHref="/" />

      <div className="space-y-6 px-4 py-5">
        <div className="fw-card px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.1em] text-faint">
            Framewalk credits
          </p>
          <p className="mt-1 font-display text-3xl text-ink">{balance}</p>
          <p className="mt-1 text-sm text-muted">
            {plan.name} · {formatPrice(plan.priceMonthly)}/mo ·{" "}
            {plan.creditsMonthly} granted
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.min(100, usagePct)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-faint">
            ~{usagePct}% of monthly allotment used (ledger approximation)
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Guided shoot + natural grade + flyer/print prep for a fraction of a
            photographer visit. Not a claim of MLS compliance.
          </p>
        </div>

        {showSoftUpsell ? (
          <div className="rounded-fw border border-accent/30 bg-accent-soft px-4 py-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-ink">
                  You&apos;re almost through this month&apos;s credits.
                </p>
                <p className="mt-1 text-xs text-muted">
                  {nextPlan
                    ? `${nextPlan.name} is ${formatPrice(nextPlan.priceMonthly)} and covers ${nextPlan.capacity}.`
                    : `Top up ${suggestTopUp.credits} for ${formatPrice(suggestTopUp.price)} and finish strong.`}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {nextPlan ? (
                    <Button size="sm" onClick={() => upgrade(nextPlan.id)}>
                      Go {nextPlan.name}
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      topUp(suggestTopUp.credits, suggestTopUp.stripeProduct)
                    }
                  >
                    Add credits
                  </Button>
                </div>
              </div>
              <button
                type="button"
                className="text-xs text-faint"
                onClick={() => dismissSoftUpsell()}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <SectionLabel>Vs traditional photo shoot</SectionLabel>
          <div className="overflow-hidden rounded-fw border border-line text-xs">
            <div className="grid grid-cols-[1fr_auto] border-b border-line bg-paper-raised px-3 py-2 font-medium">
              <span>Path</span>
              <span>Cost</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] border-b border-line px-3 py-2 text-muted">
              <span>Photographer visit</span>
              <span>$150–400</span>
            </div>
            <div className="grid grid-cols-[1fr_auto] px-3 py-2 text-ink">
              <span>Framewalk Pro (at capacity)</span>
              <span>~$10–15 / listing</span>
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Plans</SectionLabel>
          <ul className="space-y-2">
            {PLANS.map((p) => {
              const current = p.id === planId;
              return (
                <li
                  key={p.id}
                  className={`rounded-fw border px-4 py-3 ${
                    current
                      ? "border-ink bg-paper-raised"
                      : "border-line bg-paper-raised/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">
                        {p.name}{" "}
                        <span className="text-muted">
                          {formatPrice(p.priceMonthly)}/mo
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {p.creditsMonthly} credits · {p.capacity}
                      </p>
                      <p className="mt-1 text-[11px] text-faint">{p.audience}</p>
                    </div>
                    {current ? (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-accent">
                        Current
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => upgrade(p.id)}
                      >
                        {PLANS.findIndex((x) => x.id === p.id) >
                        PLANS.findIndex((x) => x.id === planId)
                          ? "Upgrade"
                          : "Switch"}
                      </Button>
                    )}
                  </div>
                  {!current &&
                  PLANS.findIndex((x) => x.id === p.id) >
                    PLANS.findIndex((x) => x.id === planId) ? (
                    <p className="mt-2 text-[10px] text-faint">
                      Stub: charged the difference today; credits land now.
                      Stripe later ({p.stripeProduct}).
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <SectionLabel>Top-up packs</SectionLabel>
          <p className="mb-2 text-xs text-muted">
            Never expire while account is active. Monthly plan credits do not
            roll over (v1).
          </p>
          <ul className="space-y-2">
            {TOP_UPS.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-fw border border-line bg-paper-raised px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {t.name} · {t.credits} credits
                  </p>
                  <p className="text-xs text-muted">
                    {formatPrice(t.price)} · ~{t.centsPerCredit}¢/credit
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => topUp(t.credits, t.stripeProduct)}
                >
                  Buy
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SectionLabel>Burn rates</SectionLabel>
          <ul className="space-y-1 text-xs text-muted">
            <li>Grade 1 photo — 1 credit</li>
            <li>Batch grade — 0.8× after first 10 (round up)</li>
            <li>Hero upscale / print prep — 2</li>
            <li>Flyer generate — 8 · Open-house pack — 18</li>
            <li>Sky polish (opt-in) — +2 + MLS disclosure</li>
          </ul>
        </div>

        <div>
          <SectionLabel>Ledger (immutable)</SectionLabel>
          <ul className="max-h-48 space-y-1 overflow-y-auto text-xs">
            {[...ledger].reverse().map((e) => (
              <li
                key={e.id}
                className="flex justify-between gap-2 border-b border-line/70 py-1.5"
              >
                <span className="text-muted">
                  {e.reason}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
                <span
                  className={
                    e.delta >= 0 ? "font-medium text-level" : "font-medium text-ink"
                  }
                >
                  {e.delta >= 0 ? "+" : ""}
                  {e.delta}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-faint">
            Stripe mapping: fw_starter / fw_pro / fw_team + fw_topup_50|150|400.
            Balance = sum(delta). Corrections are compensating entries.
          </p>
        </div>
      </div>
    </main>
  );
}
