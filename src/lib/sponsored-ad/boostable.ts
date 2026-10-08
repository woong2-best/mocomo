/** Photo (IMAGE) posts only — video-only / text-only cannot be boosted. */
export function isBoostableImageMedia(
  media?: { type?: string | null; url?: string | null }[] | null
): boolean {
  return (media ?? []).some((m) => m.type === "IMAGE" && Boolean(m.url?.trim()));
}

export function firstBoostImageUrl(
  media?: { type?: string | null; url?: string | null }[] | null
): string | null {
  const hit = (media ?? []).find((m) => m.type === "IMAGE" && Boolean(m.url?.trim()));
  return hit?.url?.trim() || null;
}

export function excerptPostText(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max).trimEnd()}…`;
}
