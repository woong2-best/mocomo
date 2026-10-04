/** Keep in sync with src/lib/moco/decimal-amount.ts (spend path only). */

export function parseSpendableMoco(raw: string | number): number | null {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    const tenths = Math.round(raw * 10);
    if (Math.abs(raw * 10 - tenths) > 1e-6) return null;
    if (tenths < 1) return null;
    return tenths / 10;
  }
  const trimmed = raw.trim().replace(/\.$/, "");
  if (!/^\d+(\.\d)?$/.test(trimmed)) return null;
  return parseSpendableMoco(Number(trimmed));
}

export function sanitizeMocoDecimalInput(raw: string, maxWholeDigits = 7): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const wholeRaw = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const whole = wholeRaw.slice(0, maxWholeDigits);
  if (dot === -1) return whole;
  const frac = cleaned.slice(dot + 1).replace(/\./g, "").slice(0, 1);
  return `${whole || "0"}.${frac}`;
}

export function appendMocoDecimalChar(current: string, char: string, maxWholeDigits = 7): string {
  if (char === ".") {
    if (current.includes(".")) return current;
    return `${current || "0"}.`;
  }
  if (!/^\d$/.test(char)) return current;
  return sanitizeMocoDecimalInput(current + char, maxWholeDigits);
}

export function formatMocoCount(moco: number): string {
  if (!Number.isFinite(moco)) return "0";
  const tenths = Math.round(Math.max(0, moco) * 10);
  return (tenths / 10).toLocaleString(undefined, { maximumFractionDigits: 1 });
}
