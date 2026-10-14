-- ============================================================
-- MoCoMo — public 스키마 RLS 잠금 (rls_disabled_in_public)
-- Project: wvjriewewajsveziuiyc
-- ============================================================
-- 분류 근거:
--   웹/앱은 Prisma(DATABASE_URL, postgres + BYPASSRLS) 와
--   서버 SUPABASE_SERVICE_ROLE_KEY(Storage) 만으로 DB에 접근한다.
--   브라우저/앱 anon 키는 Realtime broadcast(voice:/user-call:) 전용이며
--   supabase.from() / PostgREST 테이블 조회가 없다.
--   따라서 public 테이블은 전부 A(서버 전용): RLS ON, Policy 없음.
--   B(공개 SELECT) / C(auth.uid() 본인 데이터) Policy 는 만들지 않는다.
--     — 위키·행사 지도·프로필·채팅·알림도 Next.js API 경유라서 A.
--
-- 앱 영향:
--   Prisma / service_role  — BYPASSRLS → 정상
--   anon / authenticated + /rest/v1/* — Policy 없음 → 거부 (의도)
--
-- SQL Editor 에서 실행할 때 Role 을 postgres 로 둘 것.
-- ============================================================

-- ---------------------------------------------------------------------------
-- 1) public 의 모든 ordinary / partitioned 테이블에 RLS 활성화
--    이미 켜진 테이블은 no-op. 새로 생긴 54개 포함 전부 커버.
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
      AND c.relkind IN ('r', 'p')
      AND NOT c.relrowsecurity
      AND c.relname NOT LIKE 'pg_%'
  LOOP
    -- 서버(Prisma)만 접근. anon/authenticated 에 Policy 를 주지 않아 PostgREST 를 차단한다.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    RAISE NOTICE 'RLS enabled: %', r.tablename;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) 앞으로 CREATE TABLE 되는 public 테이블에도 RLS 를 자동으로 켠다.
--    SECURITY DEFINER + 고정 search_path 로 트리거 함수 하이재킹을 막는다.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enable_rls_on_new_public_tables()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table', 'partitioned table')
  LOOP
    IF cmd.schema_name = 'public' THEN
      -- 신규 public 테이블이 정책 없이 열리는 것을 막는다 (기본 A: 서버 전용).
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', cmd.object_identity);
    END IF;
  END LOOP;
END;
$$;

DROP EVENT TRIGGER IF EXISTS trg_enable_rls_on_new_public_tables;
CREATE EVENT TRIGGER trg_enable_rls_on_new_public_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  EXECUTE FUNCTION public.enable_rls_on_new_public_tables();

COMMENT ON FUNCTION public.enable_rls_on_new_public_tables() IS
  'Auto-enable RLS on new public tables so PostgREST/anon cannot read them by default.';

-- ---------------------------------------------------------------------------
-- 3) public view 가 있으면 security_invoker 로 호출자 RLS 를 따르게 한다.
--    (현재 public view 0개. 나중에 생겨도 이 블록을 다시 실행하면 된다.)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v RECORD;
BEGIN
  FOR v IN
    SELECT c.relname AS viewname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
  LOOP
    -- view 가 소유자 권한으로 RLS 를 우회하지 못하게 한다.
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true)', v.viewname);
    RAISE NOTICE 'security_invoker=true: %', v.viewname;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4) defense in depth — PostgREST 역할에서 public 객체 권한 회수
--    RLS 만으로도 차단되지만 GRANT 가 남아 있으면 테이블 목록이 노출된다.
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
