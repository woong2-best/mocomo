# MoCoMo Mobile (`apps/mobile`)

React Native (Expo SDK 57+) — **Android + iOS**. Not a WebView shell.

## Docs

- [Architecture](../../docs/MOBILE_APP_ARCHITECTURE.md)
- [Performance gates](../../docs/MOBILE_PERFORMANCE_GATES.md)
- [API contract](../../docs/MOBILE_API_CONTRACT.md)
- [Internal release (Play + TestFlight)](../../docs/MOBILE_INTERNAL_RELEASE.md)
- [Tech debt](../../docs/MOBILE_TECH_DEBT.md)

## Run

```bash
cd apps/mobile
npm start
npm run android
npm run ios
```

## Internal store builds

```bash
npx eas-cli login
npx eas-cli init          # once — fills projectId
npm run build:internal:android   # AAB → Play 내부 테스트
npm run build:internal:ios       # → TestFlight
npm run build:preview:android    # APK sideload
```

Package: `net.mocomo.app` · versionCode/buildNumber currently **10**

## Out of scope

APT · Capacitor · WebView for core features · Production store promotion
