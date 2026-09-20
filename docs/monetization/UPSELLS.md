# Upsells

Tone: confident, short. Never “✨ Magic AI”. One primary CTA.

## Trigger map

| Trigger | When | Offer | CTA |
|---------|------|-------|-----|
| **80% usage** | Balance ≤ 20% of monthly grant | Next plan or matching top-up | “Add credits” / “Go Pro” |
| **Zero balance** | Attempt grade/flyer/upscale | Top-up first (faster), upgrade secondary | “Top up 150” primary |
| **After first flyer** | Successful flyer PDF download | Open-house pack (18 cr) if not bought this listing | “Make the open-house set” |
| **After gallery approve** | Agent marks listing gallery ready | Flyer template picker | “Make a flyer” |
| **Print prep** | Agent taps Print | Hero upscale pack (2 cr × selected) + ZIP finder | “Prep for print” |
| **Streak** | 3 listings graded in a calendar month on Starter | Pro upgrade | “You’re listing like Pro” |
| **Team signal** | Second email domain on same workspace or invite sent | Team plan | “Share a credit pool” |

## Placement rules
- Soft upsell = non-modal chip or bottom sheet; dismissible; don’t block shoot.
- Hard upsell = only when the action needs credits and balance is insufficient.
- Max one soft upsell surface per session (don’t stack chips).

## Copy bank (v1)

**80% — Starter → Pro**
> You’re almost through this month’s credits. Pro is $59 and covers ~4–6 listings.

**Zero — top-up**
> Out of credits. Top up 150 for $29 and finish this listing.

**Post-flyer → OH pack**
> Nice. Want the open-house pack (3 flyers) for 18 credits?

**Streak**
> Third listing this month. Pro would have covered this with room left.

## One-tap upgrade
Billing screen + every hard-block sheet: current plan → next plan with proration note (“charged the difference today; credits land now”).

## Analytics events (wire later)
`upsell_shown`, `upsell_dismissed`, `upsell_converted` + `trigger`, `offer_sku`.
