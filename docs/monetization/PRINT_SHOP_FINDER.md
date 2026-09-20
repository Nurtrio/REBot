# Local print-shop finder (by ZIP)

## Promise
Agent finishes a flyer → enters ZIP → sees nearby print shops with distance, hours, phone, directions. No partnership required for v1.

## Flow
1. From Flyer download or Gallery → **Print**  
2. Optional: select images for print-prep upscale (2 cr each)  
3. Enter **ZIP** (pre-fill from listing address if present)  
4. Results list + map pins (mobile-first)  
5. Actions per shop: Call | Directions | Website | “Email PDF” (mailto with attachment instructions — no auto-send)

## Data source
- Google Places API (Nearby Search / Text Search): `print shop`, `copy center`, `fedex office`, `ups store` near ZIP centroid.
- Cache results per ZIP for 7 days to control cost.
- If Places key missing: show manual “search Google Maps” deep link with query `print shop near {ZIP}` — never fake shops.

## Result card fields
- Name, rating (if present), distance (mi), open now?, phone, address  
- Sort: open now → distance → rating  

## Radius
- Default 10 mi; control: 5 / 10 / 25 mi  

## Privacy
- ZIP only sent to Places; no listing photos uploaded to Google.  
- Don’t store shop PII beyond cache of public Places payload.

## UX copy
> Print near you — we’ll find shops by ZIP. You download the PDF; you choose the shop.

## Success criteria
- ZIP `90210` returns ≥3 real shops in demo with key present.  
- Empty / error state explains and offers Maps fallback.  
- No invented business names.

## Dependencies
- `GOOGLE_PLACES_API_KEY` (or Maps Platform key with Places).  
- Surface connector / secret setup when building the live screen.
