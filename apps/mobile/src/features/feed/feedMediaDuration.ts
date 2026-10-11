/** Longest clip we treat as a real duration. Longer values are ms or garbage. */
const MAX_PLAUSIBLE_SEC = 4 * 60 * 60;

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/**
 * Feed / picker / API mix seconds and milliseconds.
 * 24647 (ms for ~25s) used to render as "410:47".
 */
export function normalizeMediaDurationSec(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  let sec = raw;
  if (sec > MAX_PLAUSIBLE_SEC) {
    const asMs = sec / 1000;
    if (asMs > 0 && asMs <= MAX_PLAUSIBLE_SEC) sec = asMs;
    else return null;
  }
  return Math.max(1, Math.round(sec));
}

export function formatNormalizedDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${m}:${pad2(s)}`;
}

/**
 * Visible badge text. Missing duration stays hidden.
 * Present-but-unusable values become "0:00" instead of a huge mm:ss.
 */
export function formatFeedVideoDuration(raw: number | null | undefined): string | null {
  if (raw == null) return null;
  if (!Number.isFinite(raw) || raw <= 0) return "0:00";
  const sec = normalizeMediaDurationSec(raw);
  if (sec == null) return "0:00";
  return formatNormalizedDuration(sec);
}
