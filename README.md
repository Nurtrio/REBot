# Framewalk — Real Estate Media OS (MVP)

**Tagline:** Guided shoot. Natural grade. Instant marketing. One place.

Mobile-first PWA-ready Next.js App Router app for everyday residential agents.

## Quick start

```bash
cd /workspace/framewalk-app
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (design for ~390px width).

```bash
npm run build   # must pass
npm start
```

## Docs

- [`docs/PRODUCT_BRIEF.md`](docs/PRODUCT_BRIEF.md) — product north star
- [`docs/monetization/`](docs/monetization/) — credits, flyers, print shops, upsells

## Routes

| Path | Screen |
|------|--------|
| `/` | Home — active listings + credit pill |
| `/listings/new` | New listing form |
| `/listings/[id]` | Listing hub |
| `/listings/[id]/shoot` | Room rail, camera, horizon leveler, coach chips |
| `/listings/[id]/review` | Roll thumbs, blur/dupe flags, select |
| `/listings/[id]/grade` | Single/batch grade, before/after, cost confirm |
| `/listings/[id]/gallery` | Curated order |
| `/listings/[id]/flyer` | Templates → PDF stub download |
| `/listings/[id]/print` | Print prep + ZIP → shops |
| `/billing` | Plans, top-ups, ledger, upsells |

Seeded demo listing: **742 Pacific Crest Drive** (`lst_demo_pacific`).

## Design tokens

Documented in `src/app/globals.css` (`:root`) and mirrored in `tailwind.config.ts`.

| Token | Value | Role |
|-------|-------|------|
| `--fw-paper` | `#F7F4EF` | Warm page ground |
| `--fw-paper-raised` | `#FFFCF7` | Cards |
| `--fw-ink` | `#1A1A18` | Primary text / buttons |
| `--fw-muted` | `#6B6A64` | Secondary text |
| `--fw-line` | `#E5E1D8` | Hairlines |
| `--fw-accent` | `#C45C26` | Terracotta accent (not purple) |
| `--fw-level` | `#2D6A4F` | Horizon level / success |
| `--fw-warn` | `#B45309` | Soft flags |
| `--fw-radius` | `12px` | Default radius |

**Typography:** Newsreader (display / editorial) + DM Sans (UI). Quiet negative space; one primary action per screen.

## Credit ledger

Zustand store (`src/store/app-store.ts`) with immutable ledger rows:

`{ id, delta, reason, refId?, createdAt, note? }`

Balance = sum(delta). Structured so Stripe webhooks can append `plan_grant` / `topup` rows later. Burn rates match `docs/monetization/CREDIT_PLANS.md`.

## Stub APIs

- `src/lib/grade.ts` — natural grade pipeline placeholder (no virtual staging)
- `src/lib/flyer.ts` — template → text PDF stub download
- `src/lib/print-shops.ts` — Places when `NEXT_PUBLIC_GOOGLE_PLACES_API_KEY` set; otherwise labeled demo shops + Maps fallback (never invents live businesses)

## TODOs (real wiring)

- [ ] Clerk / Supabase auth
- [ ] Postgres listings + S3 originals/derivatives
- [ ] Stripe Checkout + webhook → ledger
- [ ] Real LUT / grade job queue (Inngest / BullMQ)
- [ ] Google Places live search
- [ ] True PDF/X flyer renderer
- [ ] DeviceOrientation permission UX on iOS
- [ ] Offline capture queue

## Non-goals (v1)

Virtual staging, structural generative edits, neon AI chrome, native iOS, CRM/MLS push.
