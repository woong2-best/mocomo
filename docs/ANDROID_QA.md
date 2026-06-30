# Android 실기기 QA 체크리스트

**대상:** Capacitor Remote WebView (`https://mocomo.net`)  
**실행:** 출시 전 · RC Sprint Gate  
**관련:** [RELEASE_QA.md](./RELEASE_QA.md) · [RC_SPRINT_USER_ONLY.md](./RC_SPRINT_USER_ONLY.md)

---

## 설치·첫 실행

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| A1 | APK/AAB 설치 후 크래시 없음 | ☐ | |
| A2 | 스플래시 → 홈 로딩 | ☐ | |
| A3 | 노치·safe-area 정상 | ☐ | |
| A4 | 오프라인 배너 표시 후 복구 | ☐ | |

## 하단 탭 (5탭)

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| B1 | 홈 ↔ 매칭 ↔ 중고 ↔ 게임 ↔ 프로필 즉시 전환 | ☐ | |
| B2 | 탭 재탭 시 뒤로가기 없음 (루트) | ☐ | |
| B3 | `/voice` 허브 뒤로가기 없음 | ☐ | |
| B4 | 게임 서브페이지 뒤로가기 정상 | ☐ | |

## 피드·탐색

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| C1 | 피드 스크롤·추가 로딩 | ☐ | |
| C2 | 좋아요·별·리포스트 | ☐ | |
| C3 | 탐색 퀵 네비 4칸 | ☐ | |
| C4 | 로그인 배너·피드 동시 표시 (깜빡임 없음) | ☐ | |

## APT·다이오라마

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| D1 | `/play/house` 진입 ≤3s | ☐ | |
| D2 | 편집·저장·재접속 유지 | ☐ | |
| D3 | 젬샵 웹 환전 | ☐ | |
| D4 | IAP 구매 (Closed Testing) | ☐ | |
| D5 | IAP 복원 | ☐ | |

## 실시간·통화

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| E1 | 피드에서 통화 수신 (소켓 연결) | ☐ | |
| E2 | 쪽지 실시간 (Socket) | ☐ | |
| E3 | 음성방 입장·퇴장 | ☐ | |

## 푸시 (FCM)

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| F1 | 알림 권한 요청 | ☐ | `FIREBASE_SERVER_KEY` 설정 시 |
| F2 | APT 경제 알림 수신 | ☐ | |
| F3 | 앱 백그라운드 딥링크 | ☐ | |

## 시스템

| # | 항목 | Pass | 메모 |
|---|------|------|------|
| G1 | 홈 버튼 → 재개 | ☐ | |
| G2 | 백그라운드 5분 후 세션 유지 | ☐ | |
| G3 | 키보드·FAB 겹침 없음 | ☐ | |

---

## 자동화 (웹·API)

```bash
npm run health:prod      # /api/health, summary
npm run smoke:api        # feed, pages
npm run persona:smoke    # 스크린샷 32장
npm run economy:stress   # 경제 Persona 3
```

## 빌드

```bash
npm run android:bundle   # Play Store AAB
npx cap sync android
```
