# Google Play 비공개 배포 (MoCoMo Android)

웹(mocomo.net)은 **앱이 불러오는 서버**입니다. Play Store 앱은 Capacitor WebView로 `https://mocomo.net`을 띄우므로, **사이트 배포를 완전히 끄면 앱도 동작하지 않습니다.**

전환 의미는 다음과 같습니다.

| 그만할 것 | 계속할 것 |
|-----------|-----------|
| 웹을 일반 사용자에게 공개·홍보 | Vercel에 API·페이지 호스팅 (앱 백엔드) |
| mocomo.net에서 직접 쓰라고 안내 | Play **비공개 테스트**로만 APK/AAB 배포 |
| 웹 UI만 맞추는 QA | **앱(WebView) 기준** QA |

---

## Play Store "비공개" 옵션

| 트랙 | 누가 설치 | 검색 노출 |
|------|-----------|-----------|
| **내부 테스트** | 초대 이메일 최대 100명 | 없음 |
| **비공개 테스트** | 초대 이메일/링크 | 없음 |
| **비공개(미등록)** | 스토어 링크 아는 사람 | 스토어 검색 없음 |

처음엔 **내부 테스트** → 안정되면 **비공개 테스트** 권장.

---

## 1. Google Play Console 준비

1. [Google Play Console](https://play.google.com/console) 개발자 계정 (1회 등록비)
2. **앱 만들기** → 앱 이름 `MoCoMo`, 기본 언어 한국어
3. 패키지명: `net.mocomo.app` (이미 `android/app/build.gradle`과 동일)
4. 앱 **공개 상태**: 처음엔 테스트 트랙만 사용 (프로덕션 공개 X)

---

## 2. 서명 키 (최초 1회)

```powershell
cd android
keytool -genkey -v -keystore mocomo-release.keystore -alias mocomo -keyalg RSA -keysize 2048 -validity 10000
```

`android/keystore.properties.example` → `keystore.properties` 복사 후 값 입력.

> `mocomo-release.keystore`, `keystore.properties`는 **절대 Git에 올리지 마세요.**

---

## 3. 로컬 APK (폰에 먼저 깔기 · Play 없이)

서명 키 없이 **디버그 APK**로 빠르게 테스트할 때.

### 준비 (최초 1회)

1. [Android Studio](https://developer.android.com/studio) 설치
2. Android Studio → **More Actions → SDK Manager** → Android SDK 설치
3. (선택) `platform-tools` 설치 후 `adb`로 USB 설치

`android/local.properties`가 없으면 Android Studio에서 프로젝트 `android/` 폴더를 한 번 열면 자동 생성됩니다.  
또는 수동:

```properties
sdk.dir=C\:\\Users\\YOUR_NAME\\AppData\\Local\\Android\\Sdk
```

### 빌드

```powershell
cd C:\Users\...\mocomo
$env:CAPACITOR_SERVER_URL="https://mocomo.net"
npm run android:debug
```

산출물: `android/app/build/outputs/apk/debug/app-debug.apk`

### 폰에 설치

**방법 A — 파일 복사**

1. APK를 카톡/드라이브/USB로 폰에 전송
2. 폰에서 APK 탭 → **알 수 없는 앱 설치** 허용 후 설치

**방법 B — USB + adb**

```powershell
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

> 디버그 APK는 Play 업로드용이 **아닙니다.** 스토어 배포 전에는 아래 AAB(릴리스)를 쓰세요.

---

## 4. AAB 빌드 (Play 내부/비공개 테스트)

```powershell
# 프로젝트 루트
$env:CAPACITOR_SERVER_URL="https://mocomo.net"
npm run cap:sync
npm run android:bundle
```

산출물: `android/app/build/outputs/bundle/release/app-release.aab`

Play Console → **테스트 → 내부 테스트** → 새 버전 → AAB 업로드.

---

## 5. 버전 올릴 때

`android/app/build.gradle`:

- `versionCode` — 정수, **매 업로드마다 +1** (필수)
- `versionName` — 사용자에게 보이는 버전 (예: `1.0.1`)

---

## 6. 테스터 초대

Play Console → 테스트 트랙 → **테스터** → 이메일 목록 추가  
테스터는 Play Store에서 **테스트 참여 링크**로 설치.

---

## 7. 웹 노출 줄이기 (선택)

앱만 쓰게 하려면:

- SNS/랜딩에서 mocomo.net 링크 제거
- `robots.txt`에 `Disallow: /` (검색 차단, 앱 WebView는 영향 없음)
- Discord OAuth 등 redirect URI는 `https://mocomo.net/...` **유지**

---

## 8. 체크리스트 (출시 전)

- [ ] 실기기에서 로그인 / APT 꾸미기 / 삭제 진동
- [ ] `CAPACITOR_SERVER_URL=https://mocomo.net` 로 빌드
- [ ] versionCode 증가
- [ ] Play Console 스토어 등록정보 (아이콘 512, 스크린샷, 개인정보 처리방침 URL)
- [ ] 내부 테스트 설치 확인 후 비공개 테스트로 확대

---

## 자주 하는 실수

- **웹 배포 중단** → 앱 빈 화면 / 로그인 실패
- **versionCode 안 올림** → Play Console 업로드 거부
- **서명 키 분실** → 같은 패키지로 업데이트 불가
- **localhost URL로 cap sync** → 출시 빌드가 개발 서버를 가리킴
