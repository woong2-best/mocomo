-- Aleph semantic cache: agent keys, cached answers (bge-m3, 1024-dim), usage ledger.
-- Run once in the Supabase SQL editor as postgres (Prisma migrate does not apply this file).
-- anon/authenticated have no policies. The Next.js routes use the service role key.

set search_path = public, extensions;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'vector') then
    execute 'create extension vector with schema extensions';
  end if;
end $$;

-- Agents authenticate with Bearer <key>; only sha256(key) is stored.
create table if not exists public.aleph_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key_hash text not null unique,
  trust double precision not null default 0.5,
  daily_limit integer not null default 1000,
  banned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint aleph_agents_key_hash_hex check (key_hash ~ '^[0-9a-f]{64}$'),
  constraint aleph_agents_trust_range check (trust >= 0 and trust <= 1),
  constraint aleph_agents_daily_limit_positive check (daily_limit > 0)
);

create table if not exists public.aleph_cache (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.aleph_agents(id) on delete cascade,
  lang text not null default 'en',
  query text not null,
  answer text not null,
  embedding vector(1024) not null,
  token_est integer not null default 0,
  hits integer not null default 0,
  good integer not null default 0,
  bad integer not null default 0,
  flagged boolean not null default false,
  last_hit_at timestamptz,
  created_at timestamptz not null default now(),
  constraint aleph_cache_query_len check (char_length(query) between 1 and 1000),
  constraint aleph_cache_answer_len check (char_length(answer) between 1 and 4000),
  constraint aleph_cache_token_est_nonneg check (token_est >= 0)
);

create index if not exists aleph_cache_embedding_cosine_idx
  on public.aleph_cache using hnsw (embedding vector_cosine_ops);

create index if not exists aleph_cache_lang_flagged_idx
  on public.aleph_cache (lang, flagged);

create table if not exists public.aleph_usage (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.aleph_agents(id) on delete cascade,
  kind text not null,
  cache_id uuid references public.aleph_cache(id) on delete set null,
  similarity double precision,
  tokens_saved integer not null default 0,
  created_at timestamptz not null default now(),
  constraint aleph_usage_kind check (kind in ('lookup_hit', 'lookup_miss', 'store', 'feedback'))
);

create index if not exists aleph_usage_agent_day_idx
  on public.aleph_usage (agent_id, created_at desc);

alter table public.aleph_agents enable row level security;
alter table public.aleph_cache enable row level security;
alter table public.aleph_usage enable row level security;

-- Nearest unflagged answer in the same language at or above min_sim (cosine).
create or replace function public.aleph_match(
  query_embedding vector(1024),
  match_lang text,
  min_sim double precision default 0.92,
  match_count integer default 1
)
returns table (
  id uuid,
  query text,
  answer text,
  token_est integer,
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    c.id,
    c.query,
    c.answer,
    c.token_est,
    (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.aleph_cache c
  where c.lang = match_lang
    and c.flagged = false
    and (1 - (c.embedding <=> query_embedding)) >= min_sim
  order by c.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 1), 1), 10);
$$;

-- Atomic hit counter (avoids read-modify-write races across edge regions).
create or replace function public.aleph_record_hit(cache_id uuid)
returns void
language sql
volatile
security invoker
set search_path = public
as $$
  update public.aleph_cache
  set hits = hits + 1, last_hit_at = now()
  where id = cache_id;
$$;

-- Atomic feedback: counters, flag rule (bad >= 3 and bad > good * 2), and agent trust
-- (+0.01 good / -0.02 bad, clamped to [0, 1]). Returns the new counters.
create or replace function public.aleph_apply_feedback(
  cache_id uuid,
  agent uuid,
  is_good boolean
)
returns table (good integer, bad integer, flagged boolean)
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  row_good integer;
  row_bad integer;
  row_flagged boolean;
begin
  update public.aleph_cache c
  set
    good = c.good + case when is_good then 1 else 0 end,
    bad = c.bad + case when is_good then 0 else 1 end
  where c.id = cache_id
  returning c.good, c.bad into row_good, row_bad;

  if not found then
    return;
  end if;

  row_flagged := row_bad >= 3 and row_bad > row_good * 2;
  update public.aleph_cache c set flagged = row_flagged where c.id = cache_id;

  update public.aleph_agents a
  set trust = least(1, greatest(0, a.trust + case when is_good then 0.01 else -0.02 end))
  where a.id = agent;

  return query select row_good, row_bad, row_flagged;
end;
$$;

revoke all on function public.aleph_match(vector, text, double precision, integer) from public;
revoke all on function public.aleph_record_hit(uuid) from public;
revoke all on function public.aleph_apply_feedback(uuid, uuid, boolean) from public;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public.aleph_match(vector, text, double precision, integer)',
    'public.aleph_record_hit(uuid)',
    'public.aleph_apply_feedback(uuid, uuid, boolean)'
  ]
  loop
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on function %s from authenticated', fn);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.aleph_agents, public.aleph_cache, public.aleph_usage from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.aleph_agents, public.aleph_cache, public.aleph_usage from authenticated';
  end if;
end $$;

notify pgrst, 'reload schema';
