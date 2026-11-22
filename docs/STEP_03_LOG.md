# Step 3: Multi-Signal AI Matching Engine Implementation

**Date:** 2026-11-22  
**Status:** ✅ Complete

---

## 1. Summary of What Was Built in Step 3

### Multi-Signal Matching Engine
Implemented a comprehensive matching system that evaluates potential matches between LOST and FOUND items using three complementary signals:

1. **Location Score** - GPS distance + location name similarity
2. **Description Score** - Text similarity + extracted attributes matching
3. **Image Score** - AI vision comparison + attribute-based fallback

### Match Persistence
- Automatic match creation when items meet threshold (≥ 0.65)
- Notification generation for match owners
- Match status tracking (PENDING_REVIEW, CONFIRMED_BY_OWNER, REJECTED)

### API Integration
- Match creation triggered automatically on item creation
- `GET /api/matches` - Query matches with filters
- `POST /api/matches/run` - Manual batch matching trigger
- `PUT /api/matches/:id` - Update match status

### Frontend UI
- `/matches` page displaying potential matches
- Side-by-side item comparison with score breakdown
- Confirm/Reject match buttons

---

## 2. Files Created & Modified

### New Files Created

| File | Purpose |
|------|---------|
| `src/lib/matching/matchingEngine.ts` | Core matching engine with scoring functions |
| `src/app/api/matches/route.ts` | Matches API endpoints (GET, POST, PUT) |
| `src/app/matches/page.tsx` | Matches browsing UI with confirmation flow |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/api/items/route.ts` | Added auto-matching on item creation |
| `src/app/layout.tsx` | Added Matches navigation link |
| `.env.example` | Added MATCH_THRESHOLD configuration |

---

## 3. Matching Formula, Weights & Normalization

### Score Components

| Component | Weight | Range |
|-----------|--------|-------|
| Location Score | 35% | 0.0 - 1.0 |
| Description Score | 45% | 0.0 - 1.0 |
| Image Score | 20% | 0.0 - 1.0 |

### Location Score Calculation

```
locationScore = (gpsScore * 0.6) + (nameScore * 0.4) + timeBonus

GPS Distance Scoring:
- < 0.2 km → 1.0
- < 1 km → 0.8
- < 5 km → 0.5
- < 20 km → 0.3
- ≥ 20 km → 0.1

Location Name Scoring:
- Token overlap Jaccard similarity
- Normalized 0.0 - 1.0

Time Bonus:
- Found < 2 hours after lost → +0.1
```

### Description Score Calculation

```
descriptionScore = categoryMatch + brandMatch + colorMatch + uniqueMarks + subcategory + aiSimilarity

- Category match: +0.30
- Brand match: +0.25
- Color match: +0.15
- Unique marks match: +0.20
- Subcategory match: +0.10
- AI semantic similarity (25% weight): 0.0 - 0.25
```

### Image Score Calculation

```
imageScore = visualSimilarity * imageWeight

When both have images:
- AI vision model comparison (with timeout)
- Weight: 1.0

When one missing:
- Attribute-based comparison
- Weight: 0.5
- Penalized to not penalize itemless items to 0
```

### Total Score

```
totalScore = (imageScore * 0.20) + (descriptionScore * 0.45) + (locationScore * 0.35)
```

---

## 4. AI vs Fallback Behavior

### Location Scoring
| Scenario | Behavior |
|----------|----------|
| Both have GPS | Haversine distance calculation |
| Only one has GPS | Falls back to 0.5 + name matching |
| Neither has GPS | Name token comparison only |

### Description Scoring
| Scenario | Behavior |
|----------|----------|
| AI API Key Set | Calls semantic similarity API (5s timeout) |
| No AI Key | Rule-based attribute matching only |
| AI Error/Timeout | Falls back to rule-based matching |

### Image Scoring
| Scenario | Behavior |
|----------|----------|
| Both have images + AI key | Vision model comparison |
| Both have images, no AI key | Attribute-based comparison |
| One missing image | Lower weight, use available attributes |
| Neither has image | Neutral 0.5 score |

---

## 5. Notification Trigger Logic & Deduplication

### When Matches Trigger
1. New item created via `POST /api/items`
2. `findAndSaveMatchesForItem(newItem.id)` is called
3. Compares against opposite-type OPEN items (excluding same user)

### Notification Creation
- One notification per match for the LOST item owner
- Message: "A potential [owner/finder] match for '[title]' was found"
- Channel: IN_APP

### Deduplication Rules
- Unique constraint on `(lostItemId, foundItemId)` prevents duplicates
- Status changes: PENDING_REVIEW → CONFIRMED_BY_OWNER/REJECTED
- Confirmed matches update item status to CLAIMED
- Rejected matches remain OPEN for other matches

### Self-Match Prevention
- Items from the same user are excluded from matching
- This prevents users from matching their own items

---

## 6. API Contracts

### `GET /api/matches`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| userId | string | Filter matches where user owns either item |
| itemId | string | Filter for specific item |
| status | string | Filter by match status |
| minScore | number | Minimum total score (default 0) |
| limit | number | Max results (default 50) |

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "match_123",
      "status": "PENDING_REVIEW",
      "totalScore": 0.85,
      "imageScore": 0.7,
      "descriptionScore": 0.9,
      "locationScore": 0.8,
      "matchReason": "85% match: Same category (Electronics) & Apple brand, matching location",
      "lostItem": { "id": "...", "title": "...", ... },
      "foundItem": { "id": "...", "title": "...", ... }
    }
  ]
}
```

### `POST /api/matches/run`

**Body:**
```json
{
  "itemId": "optional-specific-item-id"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "matchesFound": 3,
    "newMatches": [...],
    "batchSummary": {
      "evaluated": 5,
      "created": 2,
      "threshold": 0.65
    }
  }
}
```

### `PUT /api/matches/:id`

**Body:**
```json
{
  "status": "CONFIRMED_BY_OWNER" | "REJECTED"
}
```

### `POST /api/items` (Updated)

**Response now includes:**
```json
{
  "success": true,
  "data": { "id": "...", "title": "...", ... },
  "extraction": { "category": "...", "brand": "...", ... },
  "matchesFound": 1,
  "matches": [{ "id": "...", "totalScore": 0.85, ... }]
}
```

---

## 7. Frontend `/matches` UI Overview

### Page Layout
```
/-----------------------------------------------------------\
|  NAVIGATION: Home | Report Item | View Items | Matches  |
|-----------------------------------------------------------|
|  Header: "Potential Matches"                              |
|                                                           |
|  Filter: Minimum Score slider (0 - 1, default 0.5)        |
|                                                           |
|  +-------------------------------------------------------+ |
|  | Match Card 1                                        | |
|  |  Score: 85% [colored bar based on score]            | |
|  |                                                     | |
|  |  [Lost Item]     [Found Item]                       | |
|  |  Photo        |  Photo                               | |
|  |  Title        |  Title                               | |
|  |  Location     |  Location                            | |
|  |  Category/Brand | Category/Brand                    | |
|  |                                                     | |
|  |  Score Breakdown:                                   | |
|  |  Image: 70%  Desc: 90%  Loc: 80%                    | |
|  |                                                     | |
|  |  [Confirm Match] [Reject]                          | |
|  +-------------------------------------------------------+ |
|                                                           |
|  +-------------------------------------------------------+ |
|  | Match Card 2 (similar layout)                       | |
|  +-------------------------------------------------------+ |
\-----------------------------------------------------------/
```

### Features
- Visual score indicator with color coding
- Side-by-side item cards
- Detailed score breakdown
- Action buttons (Confirm/Reject) based on match status
- Responsive grid layout

---

## 8. Known Limitations & Notes for Step 4

### Limitations

1. **Manual Confirmation Required**
   - Users must manually confirm matches
   - No automated email/SMS notifications yet

2. **No Image Similarity Without API Key**
   - AI vision comparison requires `AI_API_KEY`
   - Falls back to attribute matching

3. **Single Database Match Limit**
   - SQLite doesn't support vector similarity queries
   - All comparisons are done in-memory

### Next Steps for Step 4

1. **Notification Delivery** - Add email/SMS via SMTP or services
2. **Claim Verification UI** - "Yes, this is mine" flow
3. **Image Similarity** - Add pgvector for PostgreSQL or R2 for cloud
4. **Geospatial Queries** - Radius-based filtering
5. **User Authentication** - Add login/registration
6. **Match History** - View past confirmed matches

---

## Appendix: Final Project Structure

```
Lost And Found/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── health/route.ts      # Health check
│   │   │   ├── items/route.ts       # Items CRUD + auto-matching
│   │   │   ├── matches/route.ts     # Matches API
│   │   │   ├── upload/route.ts      # Image upload
│   │   │   └── users/route.ts       # Users CRUD
│   │   ├── items/page.tsx           # Browse items
│   │   ├── matches/page.tsx         # Browse matches + confirm
│   │   ├── report/page.tsx          # Report item form
│   │   └── layout.tsx               # Navigation
│   └── lib/
│       ├── ai/extractItemDetails.ts # AI extraction service
│       ├── matching/matchingEngine.ts # Core matching engine
│       ├── prisma.ts                # Prisma client
│       └── upload/imageUpload.ts    # Image upload service
├── docs/
│   ├── STEP_01_LOG.md
│   ├── STEP_01_TEST_REPORT.md
│   ├── STEP_02_LOG.md
│   ├── STEP_02_TEST_REPORT.md
│   └── STEP_03_LOG.md
├── public/uploads/                   # Uploaded images
├── prisma/dev.db                    # SQLite database
└── package.json
```