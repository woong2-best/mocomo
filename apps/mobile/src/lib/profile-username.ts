/** Strip @ prefixes and whitespace — API usernames never include @. */
export function normalizeProfileUsername(raw: string): string {
  let s = raw.trim();
  while (s.startsWith("@")) s = s.slice(1).trim();
  return s;
}
