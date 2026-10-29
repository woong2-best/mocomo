-- MoCoMo M2M swarm memory.
-- Run once in the Supabase SQL editor as postgres (Prisma migrate does not apply this file).
-- anon/authenticated have no policies. The Next.js route uses the service role key.

set search_path = public, extensions;

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'vector') then
    execute 'create extension vector with schema extensions';
  end if;
end $$;

create table if not exists public.swarm_memory (
  id uuid primary key default gen_random_uuid(),
  node_hash text not null,
  reward_score double precision not null default 0,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  constraint swarm_memory_node_hash_hex check (node_hash ~ '^[0-9a-f]{64}$'),
  constraint swarm_memory_reward_finite check (reward_score >= -1e9 and reward_score <= 1e9)
);

create index if not exists swarm_memory_embedding_cosine_idx
  on public.swarm_memory
  using hnsw (embedding vector_cosine_ops);

alter table public.swarm_memory enable row level security;

-- Other nodes only, reward_score >= min_reward, closest cosine distance, capped at 5.
create or replace function public.match_swarm_memory(
  query_embedding vector(1536),
  exclude_node text,
  match_count integer default 5,
  min_reward double precision default 0
)
returns table (
  id uuid,
  node_hash text,
  reward_score double precision,
  embedding vector(1536),
  similarity double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    s.id,
    s.node_hash,
    s.reward_score,
    s.embedding,
    (1 - (s.embedding <=> query_embedding))::double precision as similarity
  from public.swarm_memory s
  where s.reward_score >= min_reward
    and s.node_hash is distinct from exclude_node
  order by s.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 5), 1), 5);
$$;

revoke all on function public.match_swarm_memory(vector, text, integer, double precision) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on table public.swarm_memory from anon';
    execute 'revoke all on function public.match_swarm_memory(vector, text, integer, double precision) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on table public.swarm_memory from authenticated';
    execute 'revoke all on function public.match_swarm_memory(vector, text, integer, double precision) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.match_swarm_memory(vector, text, integer, double precision) to service_role';
  end if;
end $$;

notify pgrst, 'reload schema';
