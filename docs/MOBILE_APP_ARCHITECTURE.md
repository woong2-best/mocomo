# MoCoMo Mobile App Architecture

**Status:** Phase 0 foundation (2026-07)  
**Package:** `net.mocomo.app` · **App:** [`apps/mobile`](../apps/mobile)

## Final direction

| Layer | Role |
|-------|------|
| Next.js (`src/`) | **Web only** — design/features stay; not wrapped as the app |
| React Native Expo (`apps/mobile`) | **Android + iOS app** — separate UI/UX |
| API / DB / Auth / server logic | **Shared** |
| Capacitor WebView | **Legacy / non-goal** — do not invest further |

## Design principles

1. **Mobile-first for all new features** — design the native app first; extend to web when needed.
2. This is **not** a “port the website” project. Do not copy web DOM/CSS patterns into RN.
3. Target **millions of users**: performance, scalability, maintainability first.
4. Default stack: **Expo New Architecture** (Fabric, TurboModules — mandatory on SDK 57+).
5. If RN cannot hit X/Instagram-class UX → **Kotlin / Swift** modules or screen-native UI.
6. Core features: **no WebView**.
7. **APT is permanently out of mobile scope.**
8. Library choices: long-term maintenance + performance; replace when a better RN or native path exists.
9. Every decision: **performance → scalability → maintainability**.

## Dual-platform from day one

- Do **not** build Android-only then “add iOS later”.
- Navigation, lists, video, push, permissions planned for **both** OS.
- Native modules planned as **Kotlin + Swift pairs**.
- Internal distribution: Play internal test + TestFlight.

## Performance gate (blocks next Phase)

Performance always beats feature count. Implementation alone ≠ done.

Measure on a **mid-range Android** device **and** an **iPhone**:

- Almost no scroll jank
- Instant-feeling navigations
- Very fast video start
- Instant like/comment UI
- Stable memory
- No excessive battery drain

If unmet → optimize before new features.  
One platform fail = Phase blocked.  
Numeric helpers: [`apps/mobile/src/perf/budgets.ts`](../apps/mobile/src/perf/budgets.ts) · [MOBILE_PERFORMANCE_GATES.md](./MOBILE_PERFORMANCE_GATES.md)

## App structure

```
apps/mobile/
  App.tsx                 # providers + root
  src/
    api/                  # Bearer client, paths, query client
    auth/                 # secure token store
    config/               # env / package id
    features/             # feed, reels, compose, activity, profile, …
    native/               # TurboModule bridges (no WebView)
    navigation/           # native stack + tabs
    perf/                 # budgets
    theme/                # mobile-only tokens
```

## Feature roadmap (native UX, quality-gated)

Phase 2: Feed · Reels · Post · Comments · Likes · Search · Profile · Follow · Upload · Notifications · Push  
Phase 3: DM  
Phase 4: Live · Marketplace · Community · Event  

Each Phase requires dual-platform gate pass.

## Backend work (Phase 1 — not done yet)

Today’s APIs are **cookie JWT + Origin CSRF**. RN needs:

1. Bearer access + refresh (+ OAuth PKCE)
2. Origin policy for attested mobile clients
3. REST for Server Action–only writes
4. Versioned `/api/mobile/*` DTOs (additive; web unbroken)

Client already expects Bearer: [`apps/mobile/src/api/client.ts`](../apps/mobile/src/api/client.ts).

## Related docs

- [MOBILE_PERFORMANCE_GATES.md](./MOBILE_PERFORMANCE_GATES.md)
- [MOBILE_TECH_DEBT.md](./MOBILE_TECH_DEBT.md)
- [CAPACITOR_LEGACY.md](./CAPACITOR_LEGACY.md)
- [MOBILE_API_CONTRACT.md](./MOBILE_API_CONTRACT.md)
