/**
 * X candidate-pipeline 프레임워크의 TypeScript 포팅.
 * Query → Sources → Hydrate → Filter → Score → Select → PostFilter → SideEffect
 */

export type PipelineStageResult<T> = {
  kept: T[];
  removed: T[];
};

/** 요청 컨텍스트 — X의 PipelineQuery */
export type PipelineQuery = {
  params: Record<string, number | boolean | string>;
};

/** 후보 아이템 — X의 PipelineCandidate */
export type PipelineCandidate = {
  id: string;
};

export type QueryHydrator<Q extends PipelineQuery> = {
  id: string;
  enable?: (query: Q) => boolean;
  hydrate: (query: Q) => Promise<Q>;
};

export type Source<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  enable?: (query: Q) => boolean;
  source: (query: Q) => Promise<C[]>;
};

export type Hydrator<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  enable?: (query: Q) => boolean;
  hydrate: (query: Q, candidates: C[]) => Promise<C[]>;
};

export type Filter<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  enable?: (query: Q) => boolean;
  filter: (query: Q, candidates: C[]) => PipelineStageResult<C>;
};

export type Scorer<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  enable?: (query: Q) => boolean;
  score: (query: Q, candidates: C[]) => Promise<C[]>;
};

export type SelectionResult<C extends PipelineCandidate> = {
  selected: C[];
  non_selected: C[];
};

export type Selector<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  enable?: (query: Q) => boolean;
  select: (query: Q, candidates: C[]) => SelectionResult<C>;
};

export type SideEffect<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  enable?: (query: Q) => boolean;
  run: (query: Q, selected: C[], removed: C[]) => void | Promise<void>;
};

export type CandidatePipelineConfig<Q extends PipelineQuery, C extends PipelineCandidate> = {
  id: string;
  queryHydrators: QueryHydrator<Q>[];
  sources: Source<Q, C>[];
  hydrators: Hydrator<Q, C>[];
  preScoringFilters: Filter<Q, C>[];
  scorers: Scorer<Q, C>[];
  selector: Selector<Q, C>;
  postSelectionFilters?: Filter<Q, C>[];
  sideEffects?: SideEffect<Q, C>[];
};

export type PipelineExecutionStats = {
  pipelineId: string;
  sourceCounts: Record<string, number>;
  preFilterRemoved: Record<string, number>;
  postFilterRemoved: Record<string, number>;
  selectedCount: number;
  durationMs: number;
};

export type PipelineResult<C extends PipelineCandidate> = {
  selected: C[];
  stats: PipelineExecutionStats;
};
