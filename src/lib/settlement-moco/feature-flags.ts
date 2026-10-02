/** When true, monthly 25-day lock cycles are retired in favor of on-demand Reward withdrawal. */
export function isOnDemandPayoutEnabled(): boolean {
  return process.env.FEATURE_ON_DEMAND_PAYOUT_ENABLED === "true";
}
