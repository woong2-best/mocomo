/** Stress/QA scripts — DIRECT_URL + wider pool (interactive tx, 병렬 시나리오) */
process.env.ECONOMY_SYNC_NOTIFY = "1";

function stressDatabaseUrl(): string {
  const raw =
    process.env.STRESS_USE_POOLER === "1"
      ? process.env.DATABASE_URL ?? ""
      : process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  if (!raw) return raw;
  if (raw.includes("connection_limit=")) return raw;
  const sep = raw.includes("?") ? "&" : "?";
  return `${raw}${sep}connection_limit=10`;
}

const resolved = stressDatabaseUrl();
if (resolved) {
  process.env.DATABASE_URL = resolved;
}

if (!process.env.STRESS_CONCURRENCY) {
  process.env.STRESS_CONCURRENCY = process.env.STRESS_USE_POOLER === "1" ? "2" : "3";
}
