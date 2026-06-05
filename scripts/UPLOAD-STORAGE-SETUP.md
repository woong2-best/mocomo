# 중고거래·게시글 사진 업로드 설정 (Supabase Storage)

프로덕션 **https://mocomo.net** 에서 사진이 저장되려면 아래 4단계를 순서대로 진행하세요.  
(약 5~10분, **service_role 키는 채팅·스크린샷에 올리지 마세요**.)

---

## 0. 준비 — 링크 모음

| 무엇 | 링크 |
|------|------|
| Supabase SQL Editor (새 쿼리) | https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/sql/new |
| Supabase API 키 (service_role) | https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/settings/api |
| Supabase Storage 버킷 목록 | https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/storage/buckets |
| Vercel 환경 변수 (mocomo) | https://vercel.com/woong2-bests-projects/mocomo/settings/environment-variables |
| Vercel Deployments | https://vercel.com/woong2-bests-projects/mocomo/deployments |
| 사이트 — 중고 글쓰기 | https://mocomo.net/used/new |

로컬 SQL 파일: `scripts/supabase-fix-all.sql` **755~774행 (섹션 L)**

---

## 1단계 — Storage 버킷 만들기 (SQL)

1. 브라우저에서 **SQL Editor** 열기:  
   https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/sql/new

2. 아래 SQL **전체**를 붙여넣기 (섹션 L과 동일):

```sql
-- L. Supabase Storage (중고거래·게시글 사진)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mocomo-uploads',
  'mocomo-uploads',
  true,
  26214400,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm',
    'audio/mpeg', 'audio/webm', 'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
```

3. 우측 하단 **Run** (또는 Ctrl+Enter).

4. 결과에 **Success** / 에러 없음 확인.

5. 버킷 확인:  
   https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/storage/buckets  
   → 목록에 **`mocomo-uploads`** 가 있고 **Public** 이어야 합니다.

---

## 2단계 — service_role 키 복사

1. **Project Settings → API** 열기:  
   https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/settings/api

2. **Project API keys** 영역에서:
   - `anon` `public` — **이건 Vercel에 넣지 않음** (이미 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 로 있음)
   - **`service_role` `secret`** — **이 키만** 복사 (Reveal / 눈 아이콘 후 Copy)

3. 주의:
   - `service_role` 은 **DB·Storage 전권** 키입니다. GitHub, 카톡, 스크린샷에 올리지 마세요.
   - 유출 시 Supabase → Settings → API → **Reset** 후 Vercel 값도 같이 갱신하세요.

---

## 3단계 — Vercel 환경 변수 추가

1. **Environment Variables** 페이지:  
   https://vercel.com/woong2-bests-projects/mocomo/settings/environment-variables

2. **Add New** 로 변수 추가:

| Key | Value | Environments |
|-----|--------|----------------|
| `SUPABASE_SERVICE_ROLE_KEY` | 2단계에서 복사한 **service_role** 전체 문자열 | **Production**, **Preview**, **Development** 모두 체크 권장 |
| `SUPABASE_STORAGE_BUCKET` | `mocomo-uploads` | 위와 동일 (선택이지만 넣는 것 권장) |

3. 이미 있는지 확인 (없어도 업로드는 되지만 DB용):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://wijmhtyuhhdupddtlcdh.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon 키

4. **Save** 후, 변경 사항은 **다음 배포부터** 적용됩니다.

### 로컬 개발용 (.env)

프로젝트 루트 `c:\Users\백권웅\Desktop\mocomo\.env` (없으면 `.env.example` 복사)에 추가:

```env
SUPABASE_SERVICE_ROLE_KEY="여기에_service_role_키"
SUPABASE_STORAGE_BUCKET="mocomo-uploads"
```

저장 후 `npm run dev` 재시작.

### CLI로 넣는 방법 (선택)

PowerShell, 프로젝트 폴더에서:

```powershell
cd "c:\Users\백권웅\Desktop\mocomo"
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# 프롬프트에 service_role 키 붙여넣기

npx vercel env add SUPABASE_STORAGE_BUCKET production
# 값: mocomo-uploads
```

Preview / Development에도 같은 값을 추가하려면 `production` 대신 해당 환경 이름을 사용하세요.

---

## 4단계 — 재배포

환경 변수만 바꾸면 **실행 중인 배포에는 반영되지 않습니다.** 반드시 새 배포가 필요합니다.

### 방법 A — Vercel 대시보드

1. https://vercel.com/woong2-bests-projects/mocomo/deployments  
2. 맨 위 **Production** 배포 → **⋯** → **Redeploy**  
3. **Use existing Build Cache** 끄고 Redeploy (환경 변수만 바꿨을 때 권장)

### 방법 B — CLI

```powershell
cd "c:\Users\백권웅\Desktop\mocomo"
npx vercel --prod
```

### 방법 C — Git push

GitHub에 연결되어 있으면 `main` push 후 자동 배포.

---

## 5단계 — 확인 방법

### A. Storage 버킷 (Supabase)

- https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/storage/buckets/mocomo-uploads  
- 테스트 업로드 후 `image/사용자ID/...` 폴더에 파일이 생기는지 확인.

### B. 브라우저에서 중고거래 글쓰기

1. 로그인 후: https://mocomo.net/used/new  
2. **사진** 추가 → 크롭 후 **적용** → 썸네일이 보이는지 확인.  
3. **등록** 후 상세 페이지에서 큰 이미지가 보이는지 확인.

### C. 개발자 도구 (F12) — Network

1. 사진 **적용** 클릭 시:
   - `POST /api/upload` → **200** 이고 응답에 `uploadUrl`, `publicUrl` (또는 `token`)  
   - 또는 `POST /api/upload/local` → **200** 이고 `publicUrl` 이  
     `https://wijmhtyuhhdupddtlcdh.supabase.co/storage/v1/object/public/mocomo-uploads/...` 로 시작

2. 실패 시:
   - **503** + “SUPABASE_SERVICE_ROLE_KEY” 문구 → 3단계·4단계 미완료  
   - **500** + “Bucket not found” → 1단계 SQL 미실행  
   - **401** → 로그인 필요

### D. 저장된 URL 형태

정상 예:

```text
https://wijmhtyuhhdupddtlcdh.supabase.co/storage/v1/object/public/mocomo-uploads/image/클래스ID/1234567890-photo.jpg
```

문제 있는 예 (Vercel에서 거의 안 보임):

```text
/uploads/사용자ID/1234-photo.jpg
```

예전에 등록한 글은 `/uploads/...` 로만 저장됐을 수 있어 **사진을 다시 올려 재등록**해야 합니다.

---

## 자주 묻는 것

**Q. anon 키랑 service_role 둘 다 필요한가요?**  
- anon: 클라이언트/기존 설정용 (이미 있음)  
- service_role: **서버가 Storage에 업로드**할 때만 필요 (이번에 추가)

**Q. 카톡 채팅은 되는데 사진만 안 됐어요.**  
- 채팅은 DB 메시지, 사진은 Storage/S3 경로라 설정이 따로 필요했습니다.

**Q. S3(R2) 쓰면 이 설정 안 해도 되나요?**  
- `.env` / Vercel에 `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`, `S3_PUBLIC_URL` 등을 넣으면 Supabase Storage 대신 S3 presigned 업로드를 씁니다.

---

## 체크리스트

- [ ] SQL 섹션 L 실행 → `mocomo-uploads` 버킷 Public 확인  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` Vercel Production (+ Preview 권장)  
- [ ] `SUPABASE_STORAGE_BUCKET=mocomo-uploads` (권장)  
- [ ] Redeploy 완료  
- [ ] https://mocomo.net/used/new 에서 사진 등록·상세 페이지 확인  
- [ ] Network에서 `publicUrl` 이 supabase.co/storage URL
