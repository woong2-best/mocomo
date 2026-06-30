# iOS 앱 설정 가이드

Android와 동일하게 **Remote WebView** (`https://mocomo.net`) 방식을 권장합니다.

## 1. Capacitor iOS 추가

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

## 2. IAP

- 서버 검증: `src/app/api/iap/verify/route.ts` (Apple 영수증)
- App Store Connect · Shared Secret → `APPLE_IAP_SHARED_SECRET`
- `@capgo/native-purchases` iOS 설정 (Android와 동일 패키지)

## 3. 푸시 (APNs)

1. Apple Developer → Push Notifications capability
2. Firebase 프로젝트에 iOS 앱 추가 → `GoogleService-Info.plist`
3. `FIREBASE_SERVER_KEY` 또는 FCM HTTP v1 서비스 계정
4. `NativePushRegistration`이 토큰을 `/api/push/mobile-register`에 등록

## 4. capacitor.config.ts

`server.url`은 Android와 동일하게 `https://mocomo.net` 유지.

## 5. 심사 전 체크

- [ ] ATS (App Transport Security) — HTTPS only
- [ ] 개인정보·결제 약관 링크 (`/legal/*`)
- [ ] 마이크·카메라 권한 문구 (통화·라이브)

## 현재 상태

- **서버 IAP 검증:** ✅
- **Capacitor iOS 프로젝트:** 수동 `cap add ios` 필요
- **TestFlight:** 미배포
