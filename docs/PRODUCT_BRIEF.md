# Framewalk — Real Estate Media OS (Product Brief)

**Tagline:** Guided shoot. Natural grade. Instant marketing. One place.
**Platform:** Mobile-first Progressive Web App optimized for iPhone Safari (installable to home screen). Native app later.
**ICP:** Everyday residential real estate agents who list properties and currently hire photographers OR shoot on phone with inconsistent results.
**Promise:** Walk any listing any time of day → get straight, guided frames → batch natural color grading (no structural fakeouts) → curated gallery → optional flyer + local print.

## Positioning (anti-slop)
- Quiet, precise UI. Plenty of negative space. One primary action per screen.
- Typography: editorial (not neon gradients, not purple AI blobs).
- Motion: subtle; functional (leveler snap, guide fade).
- Voice: confident, short. Never "✨ Magic AI".

## Core loops
1. **Shoot** — Create listing → room checklist → camera with overlays (horizon leveler, corner guides, "stand here" prompts from vision coach) → capture.
2. **Grade** — Per-shot or batch: exposure/WB/contrast/clarity; sky/window recovery that stays believable; NEVER move walls, furniture, or invent amenities.
3. **Curate** — Auto-order (exterior hero → living → kitchen → beds → baths → yard); reject blur/dupes; agent approval.
4. **Market** — Flyer templates (1-pager / just-listed / open house); PDF + print-ready; find print shops by ZIP (Google Places).
5. **Credits** — Every grade / flyer / upscale burns credits; plans refill monthly; top-ups + plan upgrades always one tap away.

## Credit economy (affordable vs traditional photo shoot $150–400)
| Plan | Price | Credits/mo | Rough capacity |
|------|-------|------------|----------------|
| Starter | $29 | 120 | ~1–2 listings (30–40 shots graded) |
| Pro | $59 | 350 | ~4–6 listings |
| Team | $129 | 900 | Brokerage / assistants |
- Grade photo = 1 credit
- Batch grade (listing) = 0.8× per photo after first 10
- Hero upscale / print prep = 2 credits
- Flyer generate = 8 credits
- Open-house pack (3 flyers) = 18 credits
- Top-up packs: 50 / 150 / 400 credits
Always show remaining credits + "what this will cost" before burn. Soft upsell after 80% usage.

## Guided shoot (MVP must-have)
- Device motion / CSS orientation + overlay horizon leveler (green when level).
- Room-type coach: after agent picks room (or vision suggests), show 2–4 target angles with silhouette guides ("back into the corner", "doorway frame", "island 45°").
- Capture metadata: room, angle label, timestamp, listing id.
- Offline-tolerant queue; upload when online.

## Edit engine principles
- Natural / organic: preserve architecture, flooring color truth, window views.
- Forbidden: virtual staging furniture, removing power lines as default, sky replacement unless agent toggles "sky polish" (extra credits + disclosure flag for MLS honesty).
- Models (assign best tool per job):
  - Vision coach / room detect / blur-dupe: multimodal LLM (e.g. GPT-4.1 / Claude / Gemini)
  - Color grade / exposure: specialized image model or controlled pipeline (prefer deterministic LUT + ML refine over wild generative edit)
  - Flyer layout copy: LLM with brand voice + listing facts
  - Print shop search: Places API by ZIP + category

## Tech shape (v1)
- Next.js App Router + TypeScript + Tailwind + shadcn-quality primitives (custom theme, not default shadcn lookalike).
- Auth: Clerk or Supabase Auth.
- DB: Postgres (Supabase).
- Storage: S3-compatible for originals + derivatives.
- Jobs: queue for batch grade (Inngest / BullMQ / Supabase edge).
- Payments: Stripe subscriptions + credit ledger.
- Camera: getUserMedia in PWA; progressive enhancement.
- Deploy: Vercel (when Origin↔Vercel connected) or document path.

## Screens (MVP)
1. Home — active listings + credit pill
2. New listing — address, beds/baths, hero intent
3. Shoot — room rail + camera + leveler + guide chips
4. Review roll — thumbnails, flags, select for grade
5. Grade — single / batch, before/after slider, approve
6. Gallery — ordered set, export ZIP / MLS sizes
7. Flyer — pick template, edit copy, download PDF
8. Print — ZIP → nearby shops map/list + call/directions
9. Billing — plan, usage, top-up

## Success criteria for first cloud build
- Runnable Next.js app with polished shell UI (home, listing, shoot mock camera with leveler overlay, review, grade placeholder, flyer placeholder, billing credits UI).
- Seed data for one demo listing.
- Design system tokens documented.
- README with run instructions.
- Clear TODOs for real camera, model wiring, Stripe.

## Non-goals (v1)
- Full native iOS app
- Virtual staging
- Drone / Matterport
- CRM / MLS push (phase 2)
