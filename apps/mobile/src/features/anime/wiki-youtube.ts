export function extractYoutubeId(line: string): string | null {
  const trimmed = line.trim();
  const tag = trimmed.match(/^\[youtube:([a-zA-Z0-9_-]{6,})\]\s*$/);
  if (tag) return tag[1];
  const url = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/
  );
  return url?.[1] ?? null;
}
