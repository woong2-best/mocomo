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

## FCM (Android 네이티브)

### 1. Firebase 프로젝트

1. [Firebase Console](https://console.firebase.google.com) → 앱 추가 (Android `net.mocomo.app`)
2. `google-services.json` 다운로드 → `android/app/google-services.json`
3. 클라우드 메시징 → **서버 키** 복사

### 2. Vercel

```
FIREBASE_SERVER_KEY=AAAA...
```

### 3. Android 빌드

```bash
npm run cap:sync
npm run android:bundle
```

`build.gradle`이 `google-services.json` 있으면 Google Services 플러그인 자동 적용.

### 4. 확인

- 앱 로그인 → 알림 권한 허용
- APT 경제 이벤트(장터 판매 등) 시 푸시 수신
- `/api/health/summary` → `fcm: { ok: true }`

---

## APT 알림 타입

인앱: `AptNotification` 테이블  
푸시: `sendAptNotification` → Web Push + FCM 동시 시도

---

## iOS (APNs)

FCM에 iOS 앱 등록 후 `GoogleService-Info.plist` → Xcode 프로젝트.  
→ [IOS_APP_SETUP.md](./IOS_APP_SETUP.md)
