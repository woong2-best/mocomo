/**
 * Chat game invite — rich card payload (Play Together shares).
 */

export const GAME_SHARE_MARKER_PREFIX = "[[mocomo:game-share:";
export const GAME_SHARE_MARKER_SUFFIX = "]]";

export type GameShareMode = "direct" | "lobby";

export type ParsedChatGameShare = {
  activityId: string;
  roomCode: string;
  mode: GameShareMode;
  note: string | null;
};

const MARKER_BODY_RE =
  /^([a-z0-9-]+)\|([A-Z0-9]{4,8})\|(direct|lobby)$/i;

export function encodeGameShareMessage(input: {
  activityId: string;
  roomCode: string;
  mode: GameShareMode;
  note?: string;
}): string {
  const id = input.activityId.trim();
  const code = input.roomCode.trim().toUpperCase();
  const mode = input.mode;
  const marker = `${GAME_SHARE_MARKER_PREFIX}${id}|${code}|${mode}${GAME_SHARE_MARKER_SUFFIX}`;
  const note = (input.note ?? "").trim();
  return note ? `${note}\n\n${marker}` : marker;
}

export function parseChatGameShare(
  content: string | null | undefined
): ParsedChatGameShare | null {
  if (!content?.trim()) return null;
  const text = content.trim();
  const start = text.indexOf(GAME_SHARE_MARKER_PREFIX);
  if (start < 0) return null;

  const end = text.indexOf(GAME_SHARE_MARKER_SUFFIX, start);
  if (end < 0) return null;

  const body = text.slice(
    start + GAME_SHARE_MARKER_PREFIX.length,
    end
  );
  const match = body.match(MARKER_BODY_RE);
  if (!match?.[1] || !match[2] || !match[3]) return null;

  const note = text
    .slice(0, start)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    activityId: match[1].toLowerCase(),
    roomCode: match[2].toUpperCase(),
    mode: match[3].toLowerCase() as GameShareMode,
    note: note || null,
  };
}

export function chatGameShareListPreview(
  content: string | null | undefined
): string | null {
  const parsed = parseChatGameShare(content);
  if (!parsed) return null;
  if (parsed.note) {
    const short =
      parsed.note.length > 40 ? `${parsed.note.slice(0, 40)}…` : parsed.note;
    return short;
  }
  return "게임 초대";
}
