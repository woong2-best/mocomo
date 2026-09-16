import type {
  CandidatePipelineConfig,
  PipelineCandidate,
  PipelineExecutionStats,
  PipelineQuery,
  PipelineResult,
} from "@/lib/feed-ranking/pipeline/types";

function isEnabled<Q extends PipelineQuery>(
  enable: ((query: Q) => boolean) | undefined,
  query: Q
): boolean {
  return enable ? enable(query) : true;
}

function paramNumber(query: PipelineQuery, key: string, fallback: number): number {
  const v = query.params[key];
  return typeof v === "number" ? v : fallback;
}

function paramBool(query: PipelineQuery, key: string, fallback: boolean): boolean {
  const v = query.params[key];
  return typeof v === "boolean" ? v : fallback;
}

/**
 * X home-mixer candidate_pipeline.rs 실행 순서:
 * query hydrate → sources (parallel) → [fallback if sparse] → hydrate →
 * pre-scoring filter → score → select → post-selection filter → side effects
 */
export async function executeCandidatePipeline<
  Q extends PipelineQuery,
  C extends PipelineCandidate,
>(config: CandidatePipelineConfig<Q, C>, initialQuery: Q): Promise<PipelineResult<C>> {
  const started = Date.now();
  let query = initialQuery;
  const sourceCounts: Record<string, number> = {};
  const preFilterRemoved: Record<string, number> = {};
  const postFilterRemoved: Record<string, number> = {};

  // 1. Query hydration (parallel)
  const activeQueryHydrators = config.queryHydrators.filter((h) =>
    isEnabled(h.enable, query)
  );
  const hydratedQueries = await Promise.all(
    activeQueryHydrators.map((h) => h.hydrate(query))
  );
  for (const partial of hydratedQueries) {
    query = { ...query, ...partial };
  }

  // 2. Candidate sources (parallel)
  const activeSources = config.sources.filter((s) => isEnabled(s.enable, query));
  const sourceResults = await Promise.all(
    activeSources.map(async (s) => {
      try {
        const items = await s.source(query);
        sourceCounts[s.id] = items.length;
        return items;
      } catch (e) {
        console.error(`[feed-pipeline] source ${s.id}`, e);
        sourceCounts[s.id] = 0;
        return [] as C[];
      }
    })
  );
  let candidates: C[] = sourceResults.flat();

  // 2b. FallbackCandidateSource — 후보 부족 시 전체 DB 보충
  const minCandidates = paramNumber(query, "FallbackMinCandidates", 24);
  const fallbackEnabled = paramBool(query, "EnableFallbackSource", true);
  if (
    fallbackEnabled &&
    candidates.length < minCandidates &&
    config.fallbackSources?.length
  ) {
    const activeFallback = config.fallbackSources.filter((s) => isEnabled(s.enable, query));
    const fallbackResults = await Promise.all(
      activeFallback.map(async (s) => {
        try {
          const items = await s.source(query);
          sourceCounts[s.id] = (sourceCounts[s.id] ?? 0) + items.length;
          return items;
        } catch (e) {
          console.error(`[feed-pipeline] fallback source ${s.id}`, e);
          sourceCounts[s.id] = sourceCounts[s.id] ?? 0;
          return [] as C[];
        }
      })
    );
    candidates = [...candidates, ...fallbackResults.flat()];
  }

  // 3. Candidate hydration (parallel)
  const activeHydrators = config.hydrators.filter((h) => isEnabled(h.enable, query));
  const hydratedBatches = await Promise.all(
    activeHydrators.map((h) => h.hydrate(query, candidates))
  );
  for (const batch of hydratedBatches) {
    candidates = batch;
  }

  // 4. Pre-scoring filters (sequential)
  let removedPre: C[] = [];
  for (const filter of config.preScoringFilters) {
    if (!isEnabled(filter.enable, query)) continue;
    const result = filter.filter(query, candidates);
    candidates = result.kept;
    removedPre = [...removedPre, ...result.removed];
    preFilterRemoved[filter.id] = result.removed.length;
  }

  // 5. Scoring (sequential — each scorer updates candidates; never drops)
  for (const scorer of config.scorers) {
    if (!isEnabled(scorer.enable, query)) continue;
    try {
      candidates = await scorer.score(query, candidates);
    } catch (e) {
      console.error(`[feed-pipeline] scorer ${scorer.id}`, e);
    }
  }

  // 6. Selection
  const selection = config.selector.select(query, candidates);
  let selected = selection.selected;
  let removedPost = selection.non_selected;

  // 7. Post-selection filters (sequential)
  for (const filter of config.postSelectionFilters ?? []) {
    if (!isEnabled(filter.enable, query)) continue;
    const result = filter.filter(query, selected);
    selected = result.kept;
    removedPost = [...removedPost, ...result.removed];
    postFilterRemoved[filter.id] = result.removed.length;
  }

  const stats: PipelineExecutionStats = {
    pipelineId: config.id,
    sourceCounts,
    preFilterRemoved,
    postFilterRemoved,
    selectedCount: selected.length,
    durationMs: Date.now() - started,
  };

  // 8. Side effects (fire-and-forget)
  const activeSideEffects = (config.sideEffects ?? []).filter((s) =>
    isEnabled(s.enable, query)
  );
  for (const effect of activeSideEffects) {
    void Promise.resolve(effect.run(query, selected, [...removedPre, ...removedPost])).catch(
      (e) => console.error(`[feed-pipeline] side-effect ${effect.id}`, e)
    );
  }

  return { selected, stats };
}
