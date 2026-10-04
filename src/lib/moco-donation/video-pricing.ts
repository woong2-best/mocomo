/** Video donation money math. 1 unit = 0.01 MOCO. No float arithmetic. */

export const VIDEO_DONATION_BLOCK_SEC = 10;

/** Default price: 0.1 MOCO per 10 seconds. */
export const DEFAULT_VIDEO_RATE_CENTI_PER_10_SEC = 10;

/** 0.1 MOCO = 50 USD cents, so 0.01 MOCO = 5 USD cents. */
export const USD_CENTS_PER_MOCO_CENTI = 5;

export type VideoDonationQuote = {
  playSec: number;
  billedBlocks: number;
  billedSec: number;
  mocoCenti: number;
  mocoLabel: string;
  usdCents: number;
};

export function splitCenti(total: number): { whole: number; tenths: number; hundredths: number } {
  const n = Math.max(0, Math.trunc(total));
  const whole = Math.floor(n / 100);
  const rem = n % 100;
  return { whole, tenths: Math.floor(rem / 10), hundredths: rem % 10 };
}

/** Display string from integer centi. 60 → "0.6", 15 → "0.15", 100 → "1". */
export function formatCentiAsMoco(centi: number): string {
  const n = Math.max(0, Math.trunc(centi));
  const whole = Math.floor(n / 100);
  const frac = n % 100;
  const wholeLabel = whole.toLocaleString("en-US");
  if (frac === 0) return wholeLabel;
  if (frac % 10 === 0) return `${wholeLabel}.${frac / 10}`;
  return `${wholeLabel}.${String(frac).padStart(2, "0")}`;
}

/** Parse a MOCO amount written with at most 2 decimal places into centi. */
export function parseMocoInputToCenti(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [wholeRaw, fracRaw = ""] = trimmed.split(".");
  const whole = Number(wholeRaw);
  if (!Number.isSafeInteger(whole)) return null;
  const frac = Number((fracRaw + "00").slice(0, 2));
  return whole * 100 + frac;
}

export function billedBlocksForPlaySec(playSec: number): number {
  const sec = Math.floor(playSec);
  if (!Number.isInteger(sec) || sec <= 0) return 0;
  return Math.ceil(sec / VIDEO_DONATION_BLOCK_SEC);
}

/**
 * Price for a playback length.
 * 60s at the default rate → 0.6 MOCO. 23s → 0.3 MOCO (ceil to 10s blocks).
 */
export function quoteVideoDonation(playSec: number, rateCentiPer10Sec: number): VideoDonationQuote | null {
  const sec = Math.floor(playSec);
  const rate = Math.floor(rateCentiPer10Sec);
  if (!Number.isInteger(sec) || sec <= 0) return null;
  if (!Number.isInteger(rate) || rate <= 0) return null;
  const billedBlocks = Math.ceil(sec / VIDEO_DONATION_BLOCK_SEC);
  const mocoCenti = billedBlocks * rate;
  if (!Number.isSafeInteger(mocoCenti) || mocoCenti <= 0) return null;
  return {
    playSec: sec,
    billedBlocks,
    billedSec: billedBlocks * VIDEO_DONATION_BLOCK_SEC,
    mocoCenti,
    mocoLabel: formatCentiAsMoco(mocoCenti),
    usdCents: mocoCenti * USD_CENTS_PER_MOCO_CENTI,
  };
}

export function normalizeVideoRateCenti(raw: number): number {
  const n = Math.floor(raw);
  if (!Number.isInteger(n) || n < 1) return DEFAULT_VIDEO_RATE_CENTI_PER_10_SEC;
  return Math.min(n, 1_000_000);
}

export function normalizeVideoMaxSec(raw: number): number {
  const n = Math.floor(raw);
  if (!Number.isInteger(n)) return 60;
  return Math.min(300, Math.max(10, n));
}
