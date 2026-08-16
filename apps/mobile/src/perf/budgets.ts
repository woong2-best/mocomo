/**
 * Performance budgets — gate every Phase merge.
 * See docs/MOBILE_PERFORMANCE_GATES.md
 */
export const PerformanceBudgets = {
  /** Cold start → first feed pixel (wifi), ms */
  coldStartToFeedMs: 2000,
  /** Optimistic like/comment UI feedback, ms */
  engageUiMs: 50,
  /** Target frame budget for feed scroll, ms */
  frameBudgetMs: 16,
  /** Reels: mount native players within this distance of active index */
  reelsPrebufferNeighbors: 1,
  /** Feed FlashList draw distance (px) */
  feedDrawDistance: 280,
  /** Max feed images to prefetch ahead */
  feedPrefetchCount: 6,
  /** Cap decoded feed media edge (layout px before DPR) */
  feedMediaLayoutMax: 420,
} as const;
