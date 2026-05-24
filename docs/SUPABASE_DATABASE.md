# Supabase DB 연결 (5432 막힘 해결)

## 지금 .env 에서 고칠 것

현재 설정은 **직접 연결**(`db.xxx.supabase.co:5432`)이고, 비밀번호가 `REPLACE_DB_PASSWORD` 로 남아 있을 수 있습니다.

| 항목 | 잘못된 예 | 고칠 내용 |
|------|-----------|-----------|
| 호스트 | `db.wijmhtyuhhdupddtlcdh.supabase.co` | `aws-0-리전.pooler.supabase.com` |
| 포트 (앱) | `5432` | **`6543`** + `?pgbouncer=true` |
| 비밀번호 | `REPLACE_DB_PASSWORD` | Supabase에서 **Reset** 한 새 비밀번호 |
| 사용자 | `postgres` 만 | 풀러 URL은 **`postgres.프로젝트ref`** |

## 연결 문자열 받는 방법 (Database 탭 없어도 됨)

1. 브라우저에서 열기:  
   **https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh?showConnect=true**
2. **ORMs** → **Prisma** 선택
3. **Transaction mode** (끝이 `:6543`) → `.env` 의 `DATABASE_URL`
4. **Session mode** (끝이 `:5432`, 호스트가 `pooler.supabase.com`) → `.env` 의 `DIRECT_URL`

비밀번호를 모르면:  
**Settings → Database → Reset database password**

## .env 예시 (비밀번호만 본인 것으로 교체)

`ap-northeast-2` 는 Connect 화면에 나온 리전으로 바꾸세요.

```env
DATABASE_URL="postgresql://postgres.wijmhtyuhhdupddtlcdh:****@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require"

DIRECT_URL="postgresql://postgres.wijmhtyuhhdupddtlcdh:****@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require"
```

## VS Code에서 .env 보는 법

1. 왼쪽 탐색기에서 프로젝트 `mocomo` 폴더
2. **`.env`** 파일 클릭 (없으면 `.env.example` 복사 후 이름 변경)
3. 채팅에 붙일 때 `:` 뒤 비밀번호만 `****` 로 가리기

## 터미널 테스트 (PowerShell)

```powershell
cd "c:\Users\백권웅\Desktop\mocomo"
npx prisma db push
```

성공하면:

```powershell
npm run db:seed
```

## 리전을 모를 때

```powershell
npx tsx scripts/find-supabase-pooler.ts
```

여러 리전을 시도해 연결되는 `SUPABASE_REGION` 을 출력합니다. (비밀번호는 `.env` 에 먼저 넣어야 합니다.)

## 여전히 P1001 일 때

- 비밀번호 재설정 후 `.env` 에 **즉시** 반영
- VPN/회사망이 `*.pooler.supabase.com` 도 막는지 확인
- Connect 화면의 URI를 **복사·붙여넣기** (직접 타이핑 금지)
- 비밀번호에 `@`, `#` 등 있으면 URL 인코딩 필요
