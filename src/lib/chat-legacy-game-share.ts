/** Messages sent before games were removed may still embed a game-invite marker. */
const LEGACY_GAME_SHARE_RE = /\[\[mocomo:game-share:[^\]]*\]\]/g;

/** Returns the message text without the legacy marker, or null when there is no marker. */
export function stripLegacyGameShareMarker(content: string | null | undefined): string | null {
  if (!content || !content.includes("[[mocomo:game-share:")) return null;
  return content.replace(LEGACY_GAME_SHARE_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}
