-- ============================================================
-- MoCoMo — Supabase RLS 잠금 (PostgREST / anon 키 차단)
-- ============================================================
-- MoCoMo는 Prisma(DATABASE_URL) + 서버 service_role 로만 DB/Storage에 접근합니다.
-- 클라이언트 anon 키로 /rest/v1/* 를 호출해도 데이터가 보이지 않게 합니다.
--
-- 실행: Supabase SQL Editor → 전체 붙여넣기 → Run
--   https://supabase.com/dashboard/project/wijmhtyuhhdupddtlcdh/sql/new
--
-- ⚠️ Run 전 — SQL Editor 상단 [Role] 을 postgres 로 선택 (anon 이면 public 테이블 RLS 실패)
--    storage.objects 는 supabase_storage_admin 소유 → postgres 도 ALTER TABLE RLS 불가
--    (Supabase 기본값으로 storage.objects RLS 는 이미 ON — 아래 섹션 3 참고)
--
-- 앱 영향:
--   ✅ Prisma (postgres pooler) — superuser, RLS bypass → 정상
--   ✅ SUPABASE_SERVICE_ROLE_KEY (Storage 업로드) — bypass → 정상
--   ❌ anon / authenticated + PostgREST — Policy 없음 → 전면 거부 (의도)
--
-- 새 Prisma 마이그레이션으로 public 테이블이 추가되면 이 스크립트를 다시 Run 하세요.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) public 스키마 모든 테이블 RLS 활성화
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'          -- ordinary table
      AND c.relname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'RLS enabled: %', r.tablename;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) anon / authenticated — public 스키마 직접 권한 회수 (defense in depth)
--    RLS만으로도 차단되지만, GRANT까지 제거하면 PostgREST 노출면을 더 줄입니다.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON ROUTINES FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Storage — mocomo-uploads: 공개 읽기만, anon/authenticated 쓰기·삭제 금지
--    업로드는 서버 service_role 전용 (src/lib/supabase-storage.ts)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  pol RECORD;
BEGIN
  -- 과도하게 열려 있을 수 있는 기존 Policy 제거 (버킷별 INSERT/UPDATE/DELETE/ALL)
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%upload%'
        OR policyname ILIKE '%insert%'
        OR policyname ILIKE '%update%'
        OR policyname ILIKE '%delete%'
        OR policyname ILIKE '%write%'
        OR policyname ILIKE '%authenticated%'
        OR cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    RAISE NOTICE 'Dropped storage policy: %', pol.policyname;
  END LOOP;
END $$;

-- storage.objects 는 supabase_storage_admin 소유 + Supabase 기본 RLS ON.
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY 는 42501(must be owner) 이므로 실행하지 않음.

-- 공개 버킷: API 경유 SELECT만 허용 (public URL 읽기는 버킷 public 설정으로 유지)
DROP POLICY IF EXISTS "mocomo_public_read_mocomo_uploads" ON storage.objects;
CREATE POLICY "mocomo_public_read_mocomo_uploads"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'mocomo-uploads');

-- Studio 전용 버킷이 있으면 동일하게 읽기만
DROP POLICY IF EXISTS "mocomo_public_read_mocomo_studio" ON storage.objects;
CREATE POLICY "mocomo_public_read_mocomo_studio"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'mocomo-studio');

-- anon/authenticated 에 INSERT/UPDATE/DELETE Policy 를 두지 않음 → service_role 만 쓰기 가능

-- ---------------------------------------------------------------------------
-- 4) 확인용 (Run 후 Results 탭에서 rls_enabled=false 가 0건이면 OK)
-- ---------------------------------------------------------------------------
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
-- ORDER BY 1;

-- anon 키로 REST 호출 테스트 (터미널, 401/42501/empty 는 정상):
-- curl -s "https://wijmhtyuhhdupddtlcdh.supabase.co/rest/v1/User?select=id&limit=1" \
--   -H "apikey: YOUR_ANON_KEY" -H "Authorization: Bearer YOUR_ANON_KEY"
