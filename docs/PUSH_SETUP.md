# 푸시 알림 설정

MoCoMo는 **Web Push (VAPID)** + **FCM (Android)** 두 채널을 지원합니다.

## Web Push (브라우저·PWA)

### 1. VAPID 키 생성

```bash
npx web-push generate-vapid-keys
```

### 2. Vercel 환경 변수

| 변수 | 값 |
|------|-----|
| `VAPID_PUBLIC_KEY` | 공개 키 |
| `VAPID_PRIVATE_KEY` | 비밀 키 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | 공개 키 (동일) |
| `VAPID_SUBJECT` | `mailto:support@mocomo.net` |

### 3. 확인

```bash
curl https://mocomo.net/api/push/vapid
# { "configured": true, "publicKey": "..." }
```

로그인 후 브라우저 알림 권한 허용 → `PushRegistration`이 자동 구독.

---

## FCM (Android · iOS) — HTTP v1

### 1. Firebase Android 앱

1. Android `net.mocomo.app` 등록
2. `google-services.json` → `apps/mobile/google-services.json` ✅
3. **Gradle/SDK Console 안내는 Expo에서 자동 처리 — 수동 수정 불필요**

### 2. Vercel — 서비스 계정 (권장)

Firebase Console → **프로젝트 설정 → 서비스 계정 → 새 비공개 키** → JSON 다운로드

| Key | Value |
|-----|-------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON **전체** (`{ "type": "service_account", ... }`) |

저장 후 **Redeploy**. 백엔드 `firebase-admin` HTTP v1 사용 (`src/lib/fcm-push.ts`).

### 3. 확인

- `/api/health/summary` → `fcm: { ok: true }`
- 앱 AAB 새 빌드 → 로그인 → DM/통화 (앱 종료 상태)

(Legacy `FIREBASE_SERVER_KEY`만 있으면 구 API fallback — 마이그레이션용)

---

## Expo RN 앱 (`apps/mobile`)

1. Firebase Android: `google-services.json` → `apps/mobile/google-services.json` (적용됨)
2. Vercel: `FIREBASE_SERVICE_ACCOUNT` (서비스 계정 JSON 전체)
3. 앱 **AAB 새 빌드** (EAS) — Gradle 수동 설정 불필요
4. 로그인 → 알림 권한 → DM/통화 테스트 (앱 종료 상태)

---

## APT 알림 타입

인앱: `AptNotification` 테이블  
푸시: `sendAptNotification` → Web Push + FCM 동시 시도

---

## iOS (APNs)

FCM에 iOS 앱 등록 후 `GoogleService-Info.plist` → Xcode 프로젝트.  
→ [IOS_APP_SETUP.md](./IOS_APP_SETUP.md)
