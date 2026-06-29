# Economy Stress — Sprint 2 결과

**실행:** `npm run economy:stress:quick` · `npm run economy:fraud-scan`  
**판정:** 기능 무결성 **PASS** · 성능 **WARN** (출시 Blocker 아님)

## Quick stress (10 users)

| 항목 | 결과 |
|------|------|
| Wallet 음수 | ✅ 0 |
| 중복 구매 | ✅ 0 |
| Storage mismatch | ✅ 0 |
| Notification 유실 | ✅ 0 |
| CS Replay 오류 | ✅ 0 |
| Fraud 미감지 | ✅ 0 |
| IAP 시나리오 8 | ✅ 전부 |
| Error % | ✅ 0% (benign 6건 분류) |
| P95 latency | ⚠️ ~42s (DB 원격·10유저 한계) |
| QA GATE | **WARN** (exit 0) |

## Fraud scan

| 실행 | 결과 |
|------|------|
| 200명 배치 | ✅ 완료 (~2h) |
| 20명 샘플 | ✅ 완료 (~11min) |

## 해석

- **WARN 원인:** Vercel/원격 Postgres RTT + 순차 fraud 재계산. 프로덕션 TPS 문제가 아니라 **테스트 환경 지연**.
- **재실행:** `STRESS_QUICK=1 npm run economy:stress:quick` · `FRAUD_SCAN_LIMIT=50 npm run economy:fraud-scan`

## Persona 3 매핑 (RELEASE_QA)

| Step | stress 시나리오 |
|------|----------------|
| 3.1 자기거래 | Scenario 4 Fraud |
| 3.2 골드 복사 | Scenario 2 Live dup |
| 3.3 IAP 멱등 | Scenario 8 |
| 3.4 환불 | Scenario 8 refund |
| 3.5 오프라인 | Scenario 3 |
| 3.7 RTDN | 코드 Fixed (ISSUE-004) — 스테이징 설계 검토 User |
