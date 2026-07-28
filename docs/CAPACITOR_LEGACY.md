# Capacitor = LEGACY (non-goal)

> **Product direction (2026-07):** MoCoMo’s mobile product is **React Native** in [`apps/mobile`](../apps/mobile).  
> Capacitor (`android/`, `ios/`, `capacitor.config.ts`) is **legacy**. Do not add features or invest in WebView UX.

## Why

Remote WebView loading `mocomo.net` cannot reach X/Instagram-class scroll, video, or gestures. See [MOBILE_APP_ARCHITECTURE.md](./MOBILE_APP_ARCHITECTURE.md).

## What still exists

| Path | Role now |
|------|----------|
| `capacitor.config.ts` | Legacy remote shell config |
| `android/`, `ios/`, `android-web/` | Old Capacitor native projects |
| `npm run cap:*` / `android:*` | Legacy build scripts only |
| Historical AAB/APK in repo root | Artifacts; not the RN product |

## Android / iOS 내부 배포 (RN)

→ **[MOBILE_INTERNAL_RELEASE.md](./MOBILE_INTERNAL_RELEASE.md)** (EAS AAB → Play 내부 테스트 + TestFlight)

Capacitor 경로 문서 ([PLAY_STORE_PRIVATE.md](./PLAY_STORE_PRIVATE.md))는 레거시입니다.


## Docs that described Capacitor as the app

Treat as historical unless updated:

- [PLAY_STORE_PRIVATE.md](./PLAY_STORE_PRIVATE.md) — update when RN AAB pipeline lands
- [ANDROID_QA.md](./ANDROID_QA.md), [IOS_APP_SETUP.md](./IOS_APP_SETUP.md), [PUSH_SETUP.md](./PUSH_SETUP.md) — Capacitor-era
