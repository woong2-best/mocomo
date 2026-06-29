# RC Sprint 2 — 당신만 하면 되는 것

Cursor가 처리한 것: P0/P1 코드 · 배포 · stress/fraud-scan · 공개 화면 스크린샷 32장 · 웹 녹화 7종 · 자동화 스크립트.

**아래만 하면 Gate의 “실사용” 파트가 채워집니다.**

---

## 1. Persona 1 — 신규 유저 (최우선, ~45분)

**환경:** 웹 Chrome + Android 앱(Capacitor) 각 1회  
**체크리스트:** [RELEASE_QA.md](./RELEASE_QA.md) 1.1 ~ 1.13

```
설치/첫 실행 → 회원가입·이메일인증 → 첫 집(/play/house)
→ 거실 보기 → 가구 편집·저장 → 상점 둘러보기
→ 라이브 잠깐 → 알림 탭 → 로그아웃 → 재로그인 → 집 유지 확인
```

| 할 일 | 증거 |
|--------|------|
| 위 경로 **끝까지** 1회 (웹) | `docs/sprint2-audit/recordings/web-persona1-full.webm` 권장 |
| 동일 경로 **Android 실기기** 1회 | `docs/sprint2-audit/recordings/android-persona1-full.webm` |
| 막히거나 어색한 곳 | [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md)에 ISSUE/UXD 추가 |

**타이밍 (선택):** T1~T5 [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md) 표에 기록

---

## 2. Persona 2 — 헤비 유저 (~30분)

[RELEASE_QA.md](./RELEASE_QA.md) 2.1 ~ 2.11

- 장터 등록 → 구매
- (가능 시) 비행기 모드에서 가구 이동 → 온라인 복귀 sync
- Android: IAP 구매·복원 1회 (Closed Testing)

---

## 3. Android 실기기 체크 (~15분)

앱만 켜고 관찰:

- [ ] 노치/홈 인디케이터에 버튼 가리지 않음
- [ ] 뒤로가기 / 제스처 정상
- [ ] 백그라운드 → 복귀 시 `/play/house` 유지
- [ ] 스플래시 → 첫 화면 크래시 없음

스크린샷 5~10장 → `docs/sprint2-audit/android/`

---

## 4. 로그인 스크린샷 (선택, 5분)

공개 화면 말고 **로그인 후** 화면이 필요하면:

1. mocomo.net 로그인
2. DevTools → Cookies → `authjs.session-token` 값 복사
3. 터미널:

```powershell
$env:PERSONA_BASE_URL="https://mocomo.net"
$env:PERSONA_SESSION_COOKIE="authjs.session-token=여기에값"
npm run persona:auth-smoke
```

→ `docs/sprint2-audit/web/auth/` 8장 자동 저장

---

## 5. 녹화 7종 — 아직 User인 것

| # | 장면 | 담당 |
|---|------|------|
| 3 | 가구 배치 → 저장 | **User** (편집은 로그인 필요) |
| 4 | 장터 등록/구매 | **User** |
| 5 | Live 보상 토스트 | **User** (1분 시청) |
| 6 | IAP Android | **User** |
| 7 | 로그아웃 → 재접속 | **User** |

1·2·공개 라이브 등은 이미 `npm run persona:record`로 웹 캡처됨.

---

## 6. Gate 통과 선언

다음이면 Sprint 2 Day 0 Gate **통과** 가능:

- [ ] Persona 1 웹 + Android Pass
- [ ] Persona 2 Pass (IAP는 Android 1건)
- [ ] Android 체크 Pass
- [ ] 스크린샷 30+ (공개 32 + 로그인/Android 보강)
- [ ] 녹화 7종 (웹 7 + User 4~7 보강)
- [ ] Blocker ✅ Open = 0 (코드상 **이미 0**)

---

## Cursor가 더 이상 못 하는 이유

| 항목 | 이유 |
|------|------|
| 회원가입·이메일 인증 | 실제 메일함 |
| IAP | Google Play 실기기 + 테스터 계정 |
| “5분 안에 좋아하는가” | 사람의 체감 |
| Android Resume/Safe Area | 실제 기기·노치 |

**다 끝나면** Backlog에 새 ISSUE만 적어 주시면 Day 2 P2부터 이어가면 됩니다.
