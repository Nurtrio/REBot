# Credit plans & ledger

## Positioning line (billing UI, landing, Stripe product names)
**Framewalk credits** — guided shoot + natural grade + flyer/print prep for a fraction of a photographer visit.

Never claim MLS compliance or “replaces a licensed photographer where required.” Positioning is *affordable everyday listing media*, not luxury editorial.

## Monthly plans (v1)

| Plan | Price / mo | Credits / mo | Rough capacity | Who it’s for |
|------|------------|--------------|----------------|--------------|
| **Starter** | $29 | 120 | ~1–2 listings (30–40 graded shots) | Solo agents dipping in |
| **Pro** | $59 | 350 | ~4–6 listings | Active listers |
| **Team** | $129 | 900 | Brokerage / assistants | Shared seat, one ledger per workspace |

Annual option (phase 1.5): 2 months free (pay for 10). Same credit allotment monthly.

### Cost vs traditional (show on Billing + Marketing)
| Path | Typical cost | What you get |
|------|--------------|--------------|
| Photographer visit | $150–400 / listing | Shoot only; edits/flyers often extra |
| Framewalk Pro (amortized) | ~$10–15 / listing at 4–6 listings | Guided shoot + grade + flyer credits |

Keep the math honest: show “at Pro capacity” not “cheapest cherry-pick.”

## Burn rates (must match Grade Lead + flyer flow)

| Action | Credits | Notes |
|--------|---------|-------|
| Grade 1 photo | 1 | Default |
| Batch grade (listing) | 0.8× after first 10 | First 10 @ 1.0; remainder @ 0.8, round up to whole credit |
| Hero upscale / print prep | 2 | Per image |
| Flyer generate | 8 | One template render → PDF |
| Open-house pack | 18 | 3 coordinated flyers (just-listed + OH + direction) |
| Sky polish (opt-in) | +2 | Extra + MLS disclosure flag (Grade Lead) |

**Always** show remaining credits + “this will cost **N**” before burn. No silent deduct.

## Top-up packs (no plan change)

| Pack | Credits | Price | Effective ¢/credit |
|------|---------|-------|--------------------|
| Boost | 50 | $12 | 24¢ |
| Stack | 150 | $29 | ~19¢ |
| Vault | 400 | $69 | ~17¢ |

Top-ups never expire while the account is active. Unused monthly plan credits **do not** roll over (v1 — keeps ledger simple; revisit if churn complains).

## Soft vs hard limits
- Soft: at **80%** of monthly allotment → upsell chip (see `UPSELLS.md`).
- Hard: at **0** → block grade/flyer/upscale; allow shoot + review (capture still free). CTA: top-up or upgrade.

## Stripe mapping (v1)
- Products: `fw_starter`, `fw_pro`, `fw_team` (recurring) + one-time `fw_topup_50|150|400`.
- Credit ledger table: `user_id | delta | reason | ref_id | created_at` (immutable). Balance = sum(delta).
- Subscription renew → grant plan credits as a positive ledger row (`reason=plan_grant`).
- Never mutate past rows; corrections are compensating entries.

## Team seats
- Team plan: one workspace wallet; invite seats (assistants) burn from shared balance.
- Seat cap v1: 5 members. Extra seats = later SKU.

## Open decisions (ask Regular / Freddie)
1. Rollover: keep no-rollover or 50% roll for 1 month?
2. Free trial: 40 credits once, no card — or 7-day Pro trial with card?
