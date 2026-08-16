# Mobile performance gates

**Rule:** Performance is always higher priority than new features.  
A feature is not done until it passes on **mid-range Android** device **and** an **iPhone**.

## Qualitative gate (required)

| Criterion | Pass means |
|-----------|------------|
| Scroll | Almost no stutter / hitch while flinging feed or lists |
| Navigation | Transitions feel immediate (native stack) |
| Video start | Playback begins very quickly (native decoder) |
| Engage | Like / comment UI updates instantly (optimistic) |
| Memory | Stable under long scroll / reels session (no unbounded growth) |
| Battery | No excessive drain vs comparable social apps in a 10–15 min session |

Fail any row on either platform → **stop feature work; optimize first**.  
One platform fail = Phase blocked.

## Quantitative helpers

Code: `apps/mobile/src/perf/budgets.ts`

| Metric | Budget |
|--------|--------|
| Cold start → first feed pixel (Wi‑Fi) | &lt; 2000 ms (`[perf] cold_start_to_feed` in __DEV__) |
| Like/comment optimistic UI | &lt; 50 ms |
| Feed frame budget | ~16 ms |
| Reels player mount distance | active ± 1 neighbor |

## Phase 3 engineering (landed)

- Feed: FlashList `drawDistance`, image decode width cap, disk cache, prefetch, memoized cards, optimistic likes
- Reels: viewability-driven active index, **native players only near viewport**, progressive URL preferred for start latency, poster for far slides
- Cold-start mark: `app_start` → `cold_start_to_feed`

## Device QA checklist (internal)

1. Mid Android (e.g. Snapdragon 7 / Dim A-series class) + recent iPhone  
2. Login → feed first paint; note `__DEV__` log `[perf] cold_start_to_feed`  
3. Fling feed 30s — jank / memory  
4. Open Reels — swipe 20 items; only ~2–3 players should stay warm  
5. Spam like — UI must flip before network returns  
6. Background 2 min → resume — no crash, memory not climbing unboundedly  

## Non-negotiables

- No WebView for core surfaces  
- No unvirtualized long lists  
- No hls.js / MSE in app  
- Do not merge a Phase that only works on flagship  
