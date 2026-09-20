# Flyer templates

## Credit costs
- Single flyer generate = **8 credits**
- Open-house pack (3 linked templates) = **18 credits** (save 6 vs 3×8)

## Inventory (v1 — 6 templates)

| ID | Name | Use | Page | Orientation |
|----|------|-----|------|-------------|
| `just_listed` | Just Listed | Launch day | 1 | Portrait letter |
| `open_house` | Open House | Weekend OH | 1 | Portrait letter |
| `feature_sheet` | Feature Sheet | Full facts | 1 | Portrait letter |
| `postcard` | Postcard | Mail / door drop | 1 | 6×9 landscape |
| `door_hanger` | Door Hanger | Neighborhood | 1 | Tall half-letter |
| `agent_card_sheet` | Agent + Gallery | Leave-behind | 1 | Portrait letter |

Open-house pack = `just_listed` + `open_house` + `feature_sheet` with shared listing facts / brand.

## Layout rules (anti-slop)
- Editorial type; plenty of negative space; one hero image max per side.
- Agent photo optional; never auto-generate faces.
- Listing facts from listing record only (beds, baths, sqft, price, address) — no invented amenities.
- Quiet color: brand accent from agent settings; default charcoal + paper white + one accent.
- Always include: brokerage disclosure line, agent contact, equal-housing mark placeholder.

## Print-ready export
- PDF/X-1a-ish goal later; v1: high-res PDF, 300 dpi images, 0.125" bleed on postcard/door hanger.
- Color: sRGB with “print prep” note; CMYK conversion = print shop side (or later).
- Filename: `{address-slug}_{template-id}_{YYYYMMDD}.pdf`

## Copy fields (editable before burn)
- Headline (defaults: “Just Listed”, “Open House Saturday”, etc.)
- Subhead / price
- 3 bullet features (agent editable)
- Showing time / URL / QR (optional)
- Agent name, phone, email, headshot, brokerage logo

## Generation flow
1. Pick template → preview with listing hero + facts  
2. Edit copy  
3. Show cost (**8** or **18**) + remaining credits  
4. Confirm → burn → PDF download + save to listing  

## Phase 2 (not v1)
- Multi-language (EN/ES)
- Brokerage-locked brand kits
- A/B headline variants
