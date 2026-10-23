export const QNA_BOUNTY_STEP_CENTI = 2;
export const QNA_BOUNTY_DEFAULT_CENTI = 2;
export const QNA_BOUNTY_MAX_CENTI = 10_000;

export function formatQnaBountyMoco(centi: number): string {
  if (!Number.isFinite(centi) || centi <= 0) return "0";
  const value = Math.round(centi) / 100;
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseQnaBountyInput(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim().replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  const centi = Math.round(n * 100);
  if (centi === 0) return 0;
  if (centi < QNA_BOUNTY_STEP_CENTI) return null;
  if (centi % QNA_BOUNTY_STEP_CENTI !== 0) return null;
  if (centi > QNA_BOUNTY_MAX_CENTI) return null;
  return centi;
}
