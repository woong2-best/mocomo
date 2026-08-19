import { EARNING_SOURCE_LABELS, LEDGER_LABELS } from "@/lib/wallet-labels";

export type WalletTransactionPoint = {
  id: string;
  at: string;
  type: string;
  amount: number;
  net: number;
  cumulative: number;
  label: string;
  memo: string | null;
  referenceType: string | null;
};

export type TimeBucket = {
  key: string;
  startMs: number;
  endMs: number;
  label: string;
  earned: number;
  withdrawn: number;
  net: number;
  cumulative: number;
  transactions: WalletTransactionPoint[];
};

export type Granularity = "month" | "day" | "hour" | "minute" | "transaction";

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const MINUTE_MS = 60_000;
const MIN_ZOOM_MS = 30_000;

export function ledgerNet(type: string, amount: number): number {
  if (type === "SELLER_EARNING" || type === "PAYOUT_REJECTED") return amount;
  if (type === "PAYOUT_REQUEST") return -amount;
  return 0;
}

export function ledgerLabel(type: string, referenceType: string | null): string {
  if (type === "SELLER_EARNING" && referenceType) {
    return EARNING_SOURCE_LABELS[referenceType] ?? referenceType;
  }
  return LEDGER_LABELS[type] ?? type;
}

export function buildTransactionSeries(
  entries: {
    id: string;
    type: string;
    amount: number;
    createdAt: Date;
    referenceType: string | null;
    memo: string | null;
  }[]
): WalletTransactionPoint[] {
  const sorted = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  let cumulative = 0;
  return sorted.map((entry) => {
    const net = ledgerNet(entry.type, entry.amount);
    cumulative += net;
    return {
      id: entry.id,
      at: entry.createdAt.toISOString(),
      type: entry.type,
      amount: entry.amount,
      net,
      cumulative,
      label: ledgerLabel(entry.type, entry.referenceType),
      memo: entry.memo,
      referenceType: entry.referenceType,
    };
  });
}

export function pickGranularity(rangeMs: number): Granularity {
  if (rangeMs > 180 * DAY_MS) return "month";
  if (rangeMs > 14 * DAY_MS) return "day";
  if (rangeMs > DAY_MS) return "hour";
  if (rangeMs > HOUR_MS) return "minute";
  return "transaction";
}

function bucketStartMs(ms: number, g: Granularity): number {
  const d = new Date(ms);
  if (g === "month") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  if (g === "day") return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (g === "hour") return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime();
  if (g === "minute") return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime();
  return ms;
}

function advanceBucket(startMs: number, g: Granularity): number {
  const d = new Date(startMs);
  if (g === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  if (g === "day") return startMs + DAY_MS;
  if (g === "hour") return startMs + HOUR_MS;
  if (g === "minute") return startMs + MINUTE_MS;
  return startMs + 1;
}

export function formatAxisLabel(ms: number, g: Granularity): string {
  const d = new Date(ms);
  if (g === "month") return `${d.getMonth() + 1}월`;
  if (g === "day") return `${d.getMonth() + 1}/${d.getDate()}`;
  if (g === "hour") return `${String(d.getHours()).padStart(2, "0")}:00`;
  if (g === "minute") return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export function formatTooltipTime(ms: number, g: Granularity): string {
  const d = new Date(ms);
  if (g === "month") return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  if (g === "day") return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
  return d.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: g === "transaction" ? "2-digit" : undefined,
  });
}

export function buildBuckets(
  transactions: WalletTransactionPoint[],
  startMs: number,
  endMs: number,
  granularity?: Granularity
): TimeBucket[] {
  const rangeMs = Math.max(endMs - startMs, MIN_ZOOM_MS);
  const g = granularity ?? pickGranularity(rangeMs);
  const inRange = transactions.filter((t) => {
    const ms = new Date(t.at).getTime();
    return ms >= startMs && ms <= endMs;
  });

  if (g === "transaction") {
    return inRange.map((t) => {
      const ms = new Date(t.at).getTime();
      return {
        key: t.id,
        startMs: ms,
        endMs: ms,
        label: formatAxisLabel(ms, g),
        earned: t.net > 0 ? t.net : 0,
        withdrawn: t.net < 0 ? -t.net : 0,
        net: t.net,
        cumulative: t.cumulative,
        transactions: [t],
      };
    });
  }

  const buckets: TimeBucket[] = [];
  let cursor = bucketStartMs(startMs, g);
  while (cursor < endMs) {
    const end = advanceBucket(cursor, g);
    buckets.push({
      key: `${g}-${cursor}`,
      startMs: cursor,
      endMs: end,
      label: formatAxisLabel(cursor, g),
      earned: 0,
      withdrawn: 0,
      net: 0,
      cumulative: 0,
      transactions: [],
    });
    cursor = end;
  }

  for (const t of inRange) {
    const ms = new Date(t.at).getTime();
    const bucket = buckets.find((b) => ms >= b.startMs && ms < b.endMs) ?? buckets[buckets.length - 1];
    if (!bucket) continue;
    bucket.transactions.push(t);
    if (t.net > 0) bucket.earned += t.net;
    else bucket.withdrawn += -t.net;
    bucket.net += t.net;
    bucket.cumulative = t.cumulative;
  }

  let lastCumulative =
    transactions.filter((t) => new Date(t.at).getTime() < startMs).at(-1)?.cumulative ?? 0;
  for (const bucket of buckets) {
    if (bucket.transactions.length > 0) {
      lastCumulative = bucket.transactions.at(-1)!.cumulative;
    }
    bucket.cumulative = lastCumulative;
  }

  return buckets;
}

export function clampViewport(
  startMs: number,
  endMs: number,
  minMs: number,
  maxMs: number
): { startMs: number; endMs: number } {
  let range = Math.max(endMs - startMs, MIN_ZOOM_MS);
  if (range > maxMs - minMs) range = maxMs - minMs;
  let start = startMs;
  let end = start + range;
  if (start < minMs) {
    start = minMs;
    end = minMs + range;
  }
  if (end > maxMs) {
    end = maxMs;
    start = maxMs - range;
  }
  return { startMs: start, endMs: end };
}

export function zoomAt(
  viewport: { startMs: number; endMs: number },
  centerMs: number,
  factor: number,
  bounds: { minMs: number; maxMs: number }
): { startMs: number; endMs: number } {
  const range = viewport.endMs - viewport.startMs;
  const newRange = Math.max(Math.min(range * factor, bounds.maxMs - bounds.minMs), MIN_ZOOM_MS);
  const ratio = range > 0 ? (centerMs - viewport.startMs) / range : 0.5;
  const startMs = centerMs - newRange * ratio;
  const endMs = centerMs + newRange * (1 - ratio);
  return clampViewport(startMs, endMs, bounds.minMs, bounds.maxMs);
}

export type YScaleMode = "linear" | "log";

export function buildYScale(values: number[], innerH: number, mode: YScaleMode) {
  const rawMin = Math.min(0, ...values);
  const rawMax = Math.max(1, ...values);
  const pad = innerH * 0.1;
  const plotH = innerH - pad * 2;

  if (mode === "log") {
    const logMin = Math.log10(Math.max(rawMin, 0.01));
    const logMax = Math.log10(Math.max(rawMax, 0.01));
    const span = Math.max(logMax - logMin, 1e-9);
    const toY = (v: number) => {
      const lv = Math.log10(Math.max(v, 0.01));
      return innerH - pad - ((lv - logMin) / span) * plotH;
    };
    return { toY, zeroY: toY(Math.max(rawMin, 0.01)), minV: rawMin, maxV: rawMax };
  }

  const span = Math.max(rawMax - rawMin, 1e-9);
  const toY = (v: number) => innerH - pad - ((v - rawMin) / span) * plotH;
  return { toY, zeroY: toY(0), minV: rawMin, maxV: rawMax };
}

export function buildStepPathFromBuckets(
  buckets: TimeBucket[],
  toY: (v: number) => number,
  xAt: (ms: number) => number,
  baselineCumulative: number
): string {
  if (buckets.length === 0) return "";
  const parts: string[] = [];
  let running = baselineCumulative;
  const xStart = xAt(buckets[0].startMs);
  parts.push(`M ${xStart.toFixed(1)} ${toY(running).toFixed(1)}`);
  for (const bucket of buckets) {
    const xEnd = xAt(bucket.endMs > bucket.startMs ? bucket.endMs : bucket.startMs);
    parts.push(`L ${xEnd.toFixed(1)} ${toY(running).toFixed(1)}`);
    running = bucket.cumulative;
    parts.push(`L ${xEnd.toFixed(1)} ${toY(running).toFixed(1)}`);
  }
  return parts.join(" ");
}

export function exportTransactionsCsv(transactions: WalletTransactionPoint[], year: number): string {
  const header = "id,at,type,label,amount,net,cumulative,memo,referenceType";
  const rows = transactions.map((t) =>
    [
      t.id,
      t.at,
      t.type,
      `"${t.label.replace(/"/g, '""')}"`,
      t.amount,
      t.net,
      t.cumulative,
      t.memo ? `"${t.memo.replace(/"/g, '""')}"` : "",
      t.referenceType ?? "",
    ].join(",")
  );
  return `\uFEFF${header}\n${rows.join("\n")}\n`;
}

export function exportTransactionsJson(transactions: WalletTransactionPoint[], year: number) {
  return JSON.stringify({ year, exportedAt: new Date().toISOString(), transactions }, null, 2);
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
