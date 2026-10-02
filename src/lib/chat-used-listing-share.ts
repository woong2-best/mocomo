/**
 * Used-listing card inside a chat message.
 * Keep in sync with apps/mobile/src/lib/chat-used-listing-share.ts
 *
 * New inquiries store a marker. Older inquiries stored a plain template:
 * "안녕하세요! 중고거래 문의입니다. … 링크: /used/{id}"
 */

export const USED_LISTING_MARKER_PREFIX = "[[mocomo:used-listing:";
export const USED_LISTING_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:used-listing:([a-z0-9]+)\]\]/i;
const PATH_RE = /\/(?:used|market)\/([a-z0-9]{16,32})/i;
const ATTACH_NAME_RE = /^used-listing:([a-z0-9]{16,32})$/i;

const BOILERPLATE_LINE = [
  /^(?:안녕하세요[!！.]?\s*)?중고\s*거래\s*문의입니다[.!！]?$/i,
  /^마켓\s*거래\s*메시지입니다[.!！]?$/,
  /^상품\s*[:：]\s*.+$/,
  /^가격\s*[:：]\s*.+$/,
  /^낙찰가\s*[:：]\s*.+$/,
  /^링크\s*[:：]\s*.+$/i,
  /^links?\s*[:：]\s*.+$/i,
  /^products?\s*[:：]\s*.+$/i,
  /^price\s*[:：]\s*.+$/i,
];

export type ParsedChatUsedListing = {
  listingId: string;
  /** Extra lines that are not the auto inquiry template. */
  note: string | null;
  /** Title pulled from a legacy "상품:" line, when present. */
  titleHint: string | null;
};

export function encodeUsedListingMessage(listingId: string): string {
  return `${USED_LISTING_MARKER_PREFIX}${listingId.trim()}${USED_LISTING_MARKER_SUFFIX}`;
}

export function usedListingAttachmentName(listingId: string): string {
  return `used-listing:${listingId.trim()}`;
}

export function listingIdFromAttachmentName(name: string | null | undefined): string | null {
  const match = name?.trim().match(ATTACH_NAME_RE);
  return match?.[1] ?? null;
}

export function isUsedListingAttachment(attachment: {
  id?: string;
  name?: string | null;
}): boolean {
  if (attachment.id?.startsWith("used-card-")) return true;
  return listingIdFromAttachmentName(attachment.name) != null;
}

function titleHintFromText(text: string): string | null {
  const match = text.match(/^상품\s*[:：]\s*(.+)$/m);
  const title = match?.[1]?.trim();
  return title || null;
}

function noteFromText(text: string): string | null {
  const lines = text
    .replace(MARKER_RE, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !BOILERPLATE_LINE.some((re) => re.test(line)))
    .map((line) => line.replace(PATH_RE, "").trim())
    .filter(Boolean);
  const note = lines.join("\n").trim();
  return note || null;
}

export function parseChatUsedListing(
  content: string | null | undefined
): ParsedChatUsedListing | null {
  if (!content?.trim()) return null;
  const text = content.trim();
  const marker = text.match(MARKER_RE);
  const path = text.match(PATH_RE);
  const listingId = marker?.[1] ?? path?.[1];
  if (!listingId) return null;
  return {
    listingId,
    note: noteFromText(text),
    titleHint: titleHintFromText(text),
  };
}

export function chatUsedListingListPreview(
  content: string | null | undefined
): string | null {
  const parsed = parseChatUsedListing(content);
  if (!parsed) return null;
  if (parsed.note) {
    const short = parsed.note.length > 40 ? `${parsed.note.slice(0, 40)}…` : parsed.note;
    return short;
  }
  return parsed.titleHint || "Used item";
}
