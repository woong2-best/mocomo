/** Transfer and donation MOCO — one decimal place (0.1). Stripe top-up stays whole MOCO. */

export const MOCO_SPEND_MIN = 0.1;

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

export function mocoToTenths(amount: number): number | null {
  const parsed = parseSpendableMoco(amount);
  if (parsed == null) return null;
  return Math.round(parsed * 10);
}

export function splitUnsignedTenths(totalTenths: number): { whole: number; tenths: number } {
  const abs = Math.max(0, Math.trunc(totalTenths));
  return { whole: Math.floor(abs / 10), tenths: abs % 10 };
}

export function splitSignedTenths(totalTenths: number): { whole: number; tenths: number } {
  const sign = totalTenths < 0 ? -1 : 1;
  const parts = splitUnsignedTenths(Math.abs(Math.trunc(totalTenths)));
  return { whole: sign * parts.whole, tenths: sign * parts.tenths };
}

/** whole + tenths (tenths may be >= 10; carry is included). */
export function joinMoco(whole: number, tenths = 0): number {
  return (Math.trunc(whole) * 10 + Math.trunc(tenths)) / 10;
}

export function joinSignedMoco(whole: number, tenths = 0): number {
  const sign = whole < 0 || (whole === 0 && tenths < 0) ? -1 : 1;
  return (sign * (Math.abs(Math.trunc(whole)) * 10 + Math.abs(Math.trunc(tenths)))) / 10;
}

export function mocoCovers(balance: number, amount: number): boolean {
  if (!Number.isFinite(balance) || !Number.isFinite(amount)) return false;
  return Math.round(balance * 10) >= Math.round(amount * 10);
}

/** Keypad / text field — digits and a single decimal place. */
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
  const tenths = Math.round(Math.abs(moco) * 10);
  const value = tenths / 10;
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}
