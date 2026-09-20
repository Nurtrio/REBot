# Framewalk Grade Model — Professional RE Pipeline

**North star:** Professional real-estate interior/exterior color grade that stays **organic**.  
**Hard gate:** no structural edits, no virtual staging, no invented furniture/walls/amenities.

**Aspect:** Shoot captures are **4:3** (1280×960). OpenAI edit is letterboxed to square then cropped back so iPhone frames are never square-squashed (`letterboxToSquare` / `cropSquareToOriginalAspect` in `openai-grade.ts`).

UI already routes through `pickModel` + `GradeEngine` (`src/lib/grade.ts`). Client LUT is the fallback; this doc defines the **pro** path.

---

## 1. Packs

### Interior pack (`pack: interior`)
Rooms: living, kitchen, dining, bedroom, bathroom, other.

| Pass | Intent |
|------|--------|
| White balance | Neutralize mixed tungsten/daylight; keep wood warm, not orange |
| Exposure | Lift shadows in window-lit rooms without blowing exteriors through glass |
| Window pull | Recover exterior view through windows when possible (tone only) |
| Natural warmth | Mild contrast + micro-clarity; never “HDR crunch” or neon AI look |

**Default model id:** `re-interior-pro-v1`

### Exterior pack (`pack: exterior`)
Rooms: exterior, yard.

| Pass | Intent |
|------|--------|
| Exposure / contrast | Balanced facade + landscaping |
| Sky polish (opt-in) | Cool lift / haze clean in sky region only |
| MLS disclosure | Any sky polish → `mlsDisclosure` on listing + ledger `sky_polish` |

**Default model id:** `re-exterior-pro-v1`  
**Sky variant:** `re-exterior-sky-v1` (only when `skyPolish: true`)

Batch mode may still prefer a faster id (`re-batch-fast-v1`) that maps to the same vendor “enhance” endpoint with lower quality / preview tier when credits are tight.

---

## 2. Provider choice (recommended)

### Primary: **OpenAI Images Edit** (RE-native enhance API)

| | |
|--|--|
| Why | Built for real-estate photo enhancement (color, exposure, HDR merge). PropTech API path. |
| Docs | https://www.openai.ai/api · https://docs.openai.ai |
| Auth | `x-api-key` |
| Flow | Upload → enhance job → poll/download enhanced (`GET /v3/images/{id}/enhanced`) |
| Hard gate | **Disable restage / virtual staging / structural** options on every request. Prefer enhance-only. Reject responses that advertise restaged assets. |
| Cost (vendor) | Credit per **downloaded** full enhance (preview free). Plans Essential / Advanced / Expert; PAYG available. Exact $ varies — treat as ~\$0.10–\$0.40/image ballpark until key + plan confirmed. |
| Framewalk credits | Map 1 vendor download ≈ **1–2 Framewalk grade credits** (keep `BURN.grade = 1`, batch 0.8× after 10). Sky polish addon stays `BURN.skyPolish = 2`. |

### Fallback A: **fal.ai** image-edit (strict prompt)
Use only if Autoenhance key unavailable. Prompt contract: *“Professional real estate color grade only. Adjust WB, exposure, contrast, warmth. Do not add, remove, or move any objects, furniture, walls, or sky replacements unless skyPolish=true (sky region tone only).”*  
Higher structural risk → mandatory QA diff gate (see §5).

### Fallback B: Client LUT (`clientLutEngine`)
Current canvas path (`lut-natural-v1` / `lut-interior-warm` / `lut-exterior-sky` / `lut-batch-fast`). Always available offline / demos. Not the production grade for “professionally graded” listings.

**Decision:** Ship Autoenhance as `cloud` `GradeEngine`; keep LUT as default until `OPENAI_API_KEY` is set.

---

## 3. Server job queue

```
Client  →  POST /api/grade  →  enqueue job  →  202 { jobId }
Client  →  GET  /api/grade?jobId=…  →  200 { status, results? }
Worker  →  vendor enhance  →  store derivative URL / data  →  complete
```

MVP stub (this pass): in-process async map with status `queued | running | done | failed`.  
Next: Inngest or BullMQ + S3 originals/derivatives (see README TODOs).

**Burn rules (unchanged contract):**
1. `burnGradeJob` **before** enqueue (reserve).
2. On terminal failure → `refundGradeJob`.
3. Sky polish → separate `sky_polish` ledger row + listing `mlsDisclosure`.

---

## 4. Model routing (`pickModel` → packs)

| Input | Model id | Engine |
|-------|----------|--------|
| interior room, single | `re-interior-pro-v1` | cloud when key set, else `lut-interior-warm` |
| exterior/yard, no sky | `re-exterior-pro-v1` | cloud / `lut-natural-v1` |
| exterior/yard + skyPolish | `re-exterior-sky-v1` | cloud / `lut-exterior-sky` |
| batch | `re-batch-fast-v1` | cloud preview tier / `lut-batch-fast` |

Cloud engine maps Framewalk ids → Autoenhance enhance profile; never to restage.

---

## 5. QA / hard gate

Before `markGraded`:
- Prefer before/after slider (already on Grade screen).
- Reject path: `rejectGrade` → Selected (re-charge on redo).
- Future: pixel/SSIM + optional segmentation check — fail closed if large structural delta.

**Non-goals (v1):** virtual staging, object removal, sky replacement with stock plates, neon “AI look.”

---

## 6. Env

```bash
OPENAI_API_KEY=         # enables cloud GradeEngine
GRADE_ENGINE=openai|lut # default: openai if key else lut
GRADE_WEBHOOK_SECRET=        # later
```

---

## 7. Implementation checklist

- [x] `GradeEngine` + `setGradeEngine` / `runGrade` facade (`src/lib/grade.ts`)
- [x] Stub `POST/GET /api/grade` job queue
- [x] Wire OpenAI Images Edit client (`src/lib/openai-grade.ts`)
- [ ] Persist job results to listing photo `gradedDataUrl` / S3
- [ ] Capacitor path: same API (no canvas-only on device)
- [ ] Credit cost tune after first 50 live enhances

---

## 8. Credit economics (working)

| Action | FW credits | Notes |
|--------|------------|-------|
| Single natural grade | 1 | ≈ 1 vendor download |
| Batch after first 10 | 0.8× | margin for volume |
| Sky polish / photo | +2 | MLS disclose |
| Failed job | 0 (refund) | correction ledger |

Target: keep agent cost **well below** traditional listing photographer edit fees while looking pro on iPhone Safari / PWA.


## 9. Structural QA + batch cost watch

- After OpenAI edit, `structuralQa` (`src/lib/grade-qa.ts`) compares luma edge maps (Sobel + Pearson). Fail closed if correlation &lt; `0.72` — frame is not marked graded; credits refunded for that frame.
- `estimateGradeCost` (`src/lib/grade-cost.ts`) surfaces OpenAI USD vs FW credit yield on the Grade screen and on `/api/grade` responses. Batch uses `quality: low`. Warn when batch ≥ 20 or COGS ratio &gt; 1.25.
