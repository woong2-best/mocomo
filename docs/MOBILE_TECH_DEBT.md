# Mobile tech debt & bottlenecks (Phase 0 analysis)

Early fixes applied in Phase 0 are marked **DONE**. Remaining items are sequenced.

## Critical (blocks Instagram-class app)

| Debt | Impact | Status |
|------|--------|--------|
| Capacitor remote WebView as “the app” | Hard ceiling on scroll/video/gestures | **DONE** — legacy; product path is RN ([CAPACITOR_LEGACY.md](./CAPACITOR_LEGACY.md)) |
| Cookie-only auth + Origin CSRF | RN cannot call APIs cleanly | **DONE (Phase 1)** — Bearer + `/api/mobile/` Origin-exempt |
| Server Actions for key writes (DM, follow, …) | No stable mobile REST | **Partial** — follow REST done; DM later |
| No versioned mobile DTO | Breaking web when iterating app | **DONE** — `/api/mobile/*` additive |
| Feed: React map, no virtualization (web) | Jank + memory on long feeds | **N/A for app** — RN FlashList in Phase 2 (do not port web feed) |
| Reels: CSS snap + hls.js (web) | Weak pager / decode | **N/A for app** — native video Phase 2 |
| Android-only mental model | iOS rework later | **DONE** — dual-platform scaffold + package ids on both OS |

## High (scale / maintainability)

| Debt | Impact | Plan |
|------|--------|------|
| Root Next.js + Capacitor deps intertwined | Confuses “what is the app” | Keep Capacitor scripts labeled legacy; RN lives in `apps/mobile` |
| No versioned mobile DTO | Breaking web when iterating app | **DONE** — `/api/mobile/*` additive contracts ([MOBILE_API_CONTRACT.md](./MOBILE_API_CONTRACT.md)) |
| Huge web provider tree hydrated in WebView | Cold start | Irrelevant once Capacitor retired for product |
| `public/` ~700MB if ever bundled | AAB size | RN never bundles site `public/`; media via CDN URLs |
| APT / Live / Market in same web nav as social | Dilutes social quality | APT **excluded** from app; other domains phased after social gates |

## Medium

| Debt | Plan |
|------|------|
| Push registration tied to cookie session | **DONE** — `/api/mobile/push/register` (Bearer); web cookie route remains |
| Socket auth after cookie session | Phase 3: socket JWT from Bearer |
| IAP only for APT gems | Out of app scope with APT; revisit only if marketplace needs Play Billing |

## Early resolutions in Phase 0

1. Expo RN app with **New Architecture** (SDK 57 default) for Android + iOS  
2. Bearer-oriented API client + secure token store (server in Phase 1)  
3. Tab IA: Feed · Reels · Compose · Activity · Profile (no APT / Used)  
4. Architecture, performance, API contract, Capacitor-legacy docs  
5. Cursor rule so agents do not regress to WebView-first  

## Phase 1 resolutions

1. `MobileRefreshToken` table + access JWT (`src/lib/mobile-auth-tokens.ts`)
2. `/api/mobile/auth/login|refresh|logout` (+ OAuth PKCE stub 501)
3. Origin exempt `/api/mobile/` with Bearer-required writes
4. Feed / Reels / like / comments / follow / upload / push / notifications mobile routes
5. Shared `toggleFollowForUser` + credentials login helper (web unchanged)

Further WebView polish does not move the IG-class needle. Optimize the **RN** path only.
