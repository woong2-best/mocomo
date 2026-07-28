# MoCoMo Mobile — Internal release (Play + TestFlight)

**Product app:** React Native in [`apps/mobile`](../apps/mobile)  
**Package / Bundle ID:** `net.mocomo.app`  
**Not for production store listing yet** — internal testers only.

Capacitor AAB/APK in repo root are **legacy**. Do not upload those for the RN product path.

---

## Prerequisites

1. Expo account → [expo.dev](https://expo.dev)
2. Google Play Console app already created as `net.mocomo.app` (draft OK)
3. (iOS) Apple Developer + App Store Connect app with bundle `net.mocomo.app`
4. Node 20+ · from repo: `cd apps/mobile && npm install`

### Versioning note

| Field | Current |
|-------|---------|
| `version` (user-facing) | `1.0.6` |
| Android `versionCode` | `11` (must be **>** last Capacitor upload, was 5) |
| iOS `buildNumber` | `11` |
| Play-ready artifact | `apps/mobile/dist/MoCoMo-1.0.6-play.aab` (upload key = Capacitor `mocomo`) |

Bump both before every store upload.

### Signing warning

Play already may have a Capacitor upload key for `net.mocomo.app`.

- Prefer **Play App Signing** + upload the **same upload keystore** into EAS credentials, **or**
- If you start fresh credentials, Google may reject the AAB until keys match.

Run `eas credentials` and align with Play Console → App integrity.

---

## One-time: link EAS project

```powershell
cd c:\dev\mocomo\apps\mobile
npx eas-cli login
npx eas-cli init
```

This fills `extra.eas.projectId` and `owner` in `app.json`.  
Also set `updates.url` to `https://u.expo.dev/<projectId>` if using EAS Update later.

---

## Build internal binaries

### Android AAB (Play 내부 테스트)

```powershell
cd c:\dev\mocomo\apps\mobile
npm run build:internal:android
# = eas build --profile internal --platform android
```

Download the `.aab` from the EAS build page.

### iOS (TestFlight)

```powershell
cd c:\dev\mocomo\apps\mobile
npm run build:internal:ios
# Mac + Apple creds required on EAS
```

### Sideload APK (no Play, quick device check)

```powershell
npm run build:preview:android
```

### Local Android release APK (Windows + Korean username)

EAS cloud is preferred. If building locally and username has non-ASCII chars, Expo/Gradle/CMake can crash. Use ASCII paths:

```powershell
# one-time
cmd /c 'mklink /J C:\Android\Sdk "%LOCALAPPDATA%\Android\Sdk"'
mkdir C:\dev\tmp-expo, C:\dev\gradle-home -Force

$env:TEMP="C:\dev\tmp-expo"; $env:TMP=$env:TEMP
$env:GRADLE_USER_HOME="C:\dev\gradle-home"
$env:ANDROID_HOME="C:\Android\Sdk"; $env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:CI="1"

cd c:\dev\mocomo\apps\mobile
npx expo prebuild --platform android --no-install
cd android
.\gradlew.bat assembleRelease --no-daemon
# APK: android\app\build\outputs\apk\release\app-release.apk
```

**Signing:** Local Play AAB must use the same upload keystore as Capacitor (`android/mocomo-release.keystore` + `keystore.properties`). Expo `android/app/build.gradle` loads `apps/mobile/android/keystore.properties` when present (gitignored). Debug-signed AABs are for sideload only.

**EAS still requires:** `npx eas-cli login` then `npx eas-cli init` (fills `extra.eas.projectId`) then `npm run build:internal:android` for cloud AAB — upload the Capacitor keystore into EAS credentials.

---

## Upload to Play — Internal testing

1. [Play Console](https://play.google.com/console) → MoCoMo → **테스트 → 내부 테스트**
2. **새 버전 만들기** → AAB 업로드 (`versionCode` 10+)
3. 출시 노트 (내부용) 작성 → 검토 저장
4. **테스터** 이메일 목록 추가 → 참여 링크 공유
5. Do **not** promote to Production

Complete remaining Dashboard checklist items (store listing, content rating, data safety) so the temporary name `net.mocomo.app (unreviewed)` clears after Google’s first review.

Optional auto-submit (after `eas submit` configured):

```powershell
npx eas-cli submit --profile internal --platform android --latest
```

`eas.json` submit track is `internal` + `releaseStatus: draft`.

---

## Upload to TestFlight

1. EAS iOS build finishes → `eas submit --profile internal --platform ios --latest`  
   or upload `.ipa` in Transporter
2. App Store Connect → TestFlight → Internal testers
3. Set `submit.internal.ios.ascAppId` in `eas.json` first

---

## Tester QA checklist

Use [MOBILE_PERFORMANCE_GATES.md](./MOBILE_PERFORMANCE_GATES.md).

- [ ] Login (email/password)
- [ ] Feed scroll + like
- [ ] Reels swipe + playback start
- [ ] Compose photo post
- [ ] Notifications list
- [ ] Profile + logout
- [ ] Mid Android + iPhone both feel acceptable

---

## Scripts (root)

```powershell
npm run mobile:build:internal:android
npm run mobile:build:internal:ios
npm run mobile:build:preview:android
```

---

## Out of scope for this track

- Production / open testing promotion
- APT
- Capacitor WebView rebuilds
