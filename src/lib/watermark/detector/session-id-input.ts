/** Client/admin session id input — cuid watermark sessions only. */
export function normalizeWatermarkSessionIdInput(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return null;
  // Ignore placeholder / DevTools snippet pasted literally.
  if (/devtools|canvases\(\)|sessionid/i.test(trimmed)) return null;
  if (/^c[a-z0-9]{20,32}$/i.test(trimmed)) return trimmed;
  return null;
}

export function isLikelyWatermarkSessionId(raw: string | null | undefined): boolean {
  return normalizeWatermarkSessionIdInput(raw) !== null;
}
