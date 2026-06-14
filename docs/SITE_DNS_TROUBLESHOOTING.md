# mocomo.net 사이트 접속 불가 — 대응 매뉴얼

> **언제 쓰나:** `ERR_CONNECTION_REFUSED`, `사이트 연결할 수 없음`, Vercel **Invalid Configuration**, 예전엔 됐는데 갑자기 안 될 때  
> **목표:** 5분 안에 원인 구분 → 30분 안에 복구 (또는 Namecheap 티켓)

---

## 0. 한 줄 요약 (기억할 것)

| 증상 | 거의 항상 원인 |
|------|----------------|
| 연결 거부 / 타임아웃 | **DNS가 잘못된 IP** (Namecheap 징계 NS 또는 A 레코드 오류) |
| Vercel Invalid | **공개 DNS가 Vercel IP를 안 가리킴** (앱/배포 문제 아님) |
| `mocomo-five.vercel.app`도 안 됨 | Vercel이 `mocomo.net`으로 307 → **도메인 DNS 먼저** |

**정상일 때 숫자 (2026-06 기준):**

- NS: `autumn.ns.cloudflare.com`, `santino.ns.cloudflare.com`
- A (`@`): `216.198.79.1` (Vercel 권장 IP, 예전 `76.76.21.21` 아님)
- `https://mocomo.net` → **HTTP 200**

---

## 1. 5분 진단 (PC에서)

PowerShell:

```powershell
# 1) 네임서버 — cloudflare 여야 함
nslookup -type=NS mocomo.net 8.8.8.8

# 2) IP — 216.198.79.1 (또는 Cloudflare 프록시 IP) 여야 함
nslookup mocomo.net 8.8.8.8

# 3) HTTPS 응답
curl.exe -sI --max-time 15 "https://mocomo.net"
```

### 결과 해석

| NS 결과 | IP 결과 | 의미 |
|---------|---------|------|
| `failed-whois-verification.namecheap.com` | `198.54.117.242` | **Namecheap WHOIS/NS 징계** → [2-A](#2-a-namecheap-whois--ns-징계) |
| `autumn/santino.cloudflare.com` | `216.198.79.1` | DNS 정상 → Vercel/앱 쪽 확인 |
| Cloudflare NS | 다른 IP | Cloudflare A 레코드 오류 → [2-C](#2-c-cloudflare-dns) |
| Cloudflare NS | `216.198.79.1` | DNS OK, 사이트만 5xx | Vercel 배포/앱 로그 |

**웹으로 NS 전파 확인:**  
https://dnschecker.org/#NS/mocomo.net  
https://dnschecker.org/#A/mocomo.net  

---

## 2. 원인별 해결 (순서 고정)

### 2-A. Namecheap WHOIS / NS 징계

**증상:** NS에 `failed-whois-verification` 또는 `verify-contact-details`, IP `198.54.x`

**원인:** 등록 연락처 미인증 → Namecheap이 NS를 징계 서버로 되돌림.  
Cloudflare/Vercel 설정이 맞아도 **인터넷 전체가 Cloudflare를 안 봄**.

#### 순서

1. **WHOIS 이메일 인증**  
   https://ap.www.namecheap.com/domains/list/ → `mocomo.net`  
   → `Verification Required` → 등록 이메일(스팸함) **Verify**  
   → 상태 **ACTIVE**

2. **NS = Cloudflare Custom DNS**  
   같은 페이지 → **Domain** → **Nameservers** → **Custom DNS**:

   ```
   autumn.ns.cloudflare.com
   santino.ns.cloudflare.com
   ```

   → **✓ 저장** (화면에 Custom DNS + 위 2개가 그대로 보여야 함)

3. **NS 삭제 후 재저장** (패널은 맞는데 전파 안 될 때)  
   - NS 2개 삭제 → 저장 → 5분 대기 → 다시 입력 → 저장

4. **24시간+ 그대로면 Namecheap 지원**  
   https://www.namecheap.com/support/  

   ```
   Domain: mocomo.net
   Panel shows Custom DNS: autumn.ns.cloudflare.com, santino.ns.cloudflare.com
   But public DNS still shows failed-whois-verification.namecheap.com
   Please push nameserver change to registry.
   ```

---

### 2-B. Cloudflare는 맞는데 Namecheap 패널도 맞는데 전파만 느릴 때

- Cloudflare 권한 DNS 직접 조회 (A가 맞으면 Cloudflare 설정 OK):

  ```powershell
  nslookup mocomo.net autumn.ns.cloudflare.com
  ```

  → `216.198.79.1` 나오면 Cloudflare OK, **Namecheap 레지스트리 반영만 대기**

- https://dnschecker.org/#NS/mocomo.net 에서 전 세계 green 될 때까지 (보통 1~24시간)

---

### 2-C. Cloudflare DNS

**대시보드:** https://dash.cloudflare.com → `mocomo.net` → **DNS** → **Records**

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `@` | `216.198.79.1` | **DNS only** (회색 구름) 권장 |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |

- `@` A가 `76.76.21.21` / `198.54.x` → **삭제 후 `216.198.79.1`로 수정**
- Vercel Manual setup 값과 **일치**해야 함

**이메일(Resend)용** (가입 메일 안 갈 때만 추가 확인):

| Type | Name | 용도 |
|------|------|------|
| TXT | `resend._domainkey` | Resend DKIM |
| TXT | `send` | SPF |
| MX | `send` | `feedback-smtp.ap-northeast-1.amazonses.com` (10) |

---

### 2-D. Vercel Domains

**링크:** https://vercel.com/woong2-bests-projects/mocomo/settings/domains

1. `mocomo.net` → **Manual setup** → A `@` = `216.198.79.1` 확인
2. **Auto configure** → Cloudflare 쓸 때는 **무시** (Manual과 Cloudflare만 맞추면 됨)
3. DNS 전파 후 **Refresh** → **Valid Configuration**
4. 배포 자체 확인: Deployments → 최신 **Ready**

**앱 코드 문제 vs DNS:**

- Vercel Deployment **Ready** + DNS **Invalid** → **100% DNS**
- Deployment **Failed** → 빌드 로그 확인 (DNS와 무관)

---

## 3. 당장 급할 때 임시 우회

### A. hosts 파일 (본인 PC만, DNS 고치는 동안)

1. 메모장 **관리자 권한**
2. `C:\Windows\System32\drivers\etc\hosts` 맨 아래:

   ```
   216.198.79.1 mocomo.net
   216.198.79.1 www.mocomo.net
   ```

3. 저장 → 브라우저 완전 종료 후 https://mocomo.net  
4. **DNS 정상화 후 반드시 2줄 삭제**

### B. 로컬 개발

```powershell
cd Desktop\mocomo
npm run dev
```

→ http://localhost:3000 (도메인과 무관하게 앱 확인)

---

## 4. 복구 완료 체크리스트

- [ ] `nslookup -type=NS mocomo.net 8.8.8.8` → `cloudflare.com` NS
- [ ] `nslookup mocomo.net 8.8.8.8` → `216.198.79.1` (또는 Cloudflare IP)
- [ ] https://mocomo.net → 페이지 로드 (200)
- [ ] Vercel Domains → **Valid Configuration**
- [ ] (선택) 가입 메일 테스트 — Resend Verified

---

## 5. 하지 말 것

| 하지 말 것 | 이유 |
|------------|------|
| Cloudflare A만 바꾸고 Namecheap NS 징계 무시 | 징계 NS면 Cloudflare 설정 **적용 안 됨** |
| Vercel에서 Auto configure만 반복 | Cloudflare DNS 쓸 때 효과 없음 |
| `76.76.21.21` 고집 | Vercel 신규 권장 IP는 **`216.198.79.1`** |
| DNS 안 고치고 앱 코드만 수정 | 연결 거부는 **거의 항상 DNS** |

---

## 6. 빠른 링크 모음

| 할 일 | URL |
|------|-----|
| Namecheap 도메인 | https://ap.www.namecheap.com/domains/list/ |
| Namecheap 지원 | https://www.namecheap.com/support/ |
| Cloudflare DNS | https://dash.cloudflare.com |
| Vercel Domains | https://vercel.com/woong2-bests-projects/mocomo/settings/domains |
| Vercel Deployments | https://vercel.com/woong2-bests-projects/mocomo |
| NS 전파 확인 | https://dnschecker.org/#NS/mocomo.net |
| A 전파 확인 | https://dnschecker.org/#A/mocomo.net |
| Resend Domains | https://resend.com/domains |

---

## 7. 이번 사건 타임라인 (참고)

1. Namecheap **Contacts verification** → NS가 `failed-whois-verification`으로 고정  
2. 전 세계 IP → `198.54.117.242` → **443 연결 거부**  
3. Cloudflare A=`216.198.79.1`은 **맞았지만** NS가 Cloudflare가 아니어서 **무효**  
4. Namecheap Custom DNS 저장 + WHOIS 인증 후 NS 전파  
5. `216.198.79.1` + Cloudflare NS → **사이트 복구**

---

## 8. 연락처 / 에스컬레이션

1. **DNS (NS/A)** → Namecheap Support (위 영문 템플릿)  
2. **Vercel Valid 안 됨 (DNS는 맞음)** → Vercel Support + Domains 스크린샷  
3. **가입 메일** → Resend Domains + Cloudflare MX/TXT  
4. **앱 500/빌드 실패** → Vercel Deployment 로그 (DNS 매뉴얼과 별개)

---

*마지막 검증: 2026-06-09 — NS cloudflare, A 216.198.79.1, https://mocomo.net HTTP 200*
