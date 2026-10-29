/**
 * Split a post body into caption (real writing) vs hashtags.
 * Used for compose validation and Reels overlay vs description.
 *
 * Tokens: `#tag` and `# tag` (space after #). `C#` is not a hashtag.
 */

const HASHTAG_TOKEN_RE = /(?<![\w\u0080-\uFFFF])#\s*[\w\u0080-\uFFFF]+/gu;
const LOOSE_HASH_RE = /(?<![\w\u0080-\uFFFF])#+(?![\w\u0080-\uFFFF])/gu;

export const HASHTAG_ONLY_POST_ERROR = "compose.hashtagOnly";

export function extractHashtagNamesLoose(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const match of text.matchAll(HASHTAG_TOKEN_RE)) {
    const tag = match[0].replace(/^#\s*/, "");
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  return out;
}

function tidyCaption(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function splitPostCaptionAndHashtags(text: string): {
  caption: string;
  hashtags: string[];
  hashtagLine: string;
} {
  const source = text ?? "";
  const hashtags = extractHashtagNamesLoose(source);
  const caption = tidyCaption(
    source.replace(HASHTAG_TOKEN_RE, " ").replace(LOOSE_HASH_RE, " ")
  );
  return {
    caption,
    hashtags,
    hashtagLine: hashtags.map((tag) => `#${tag}`).join(" "),
  };
}

/** True when leftover text is more than hashtags / lone #. */
export function hasMeaningfulPostCaption(text: string): boolean {
  return splitPostCaptionAndHashtags(text).caption.length > 0;
}

export function splitReelOverlayCaption(
  title: string | null | undefined,
  content: string
): { overlay: string; hashtagLine: string } {
  const body = splitPostCaptionAndHashtags(content ?? "");
  const heading = splitPostCaptionAndHashtags(title ?? "");
  const overlay = [heading.caption, body.caption].filter(Boolean).join("\n");
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const tag of [...heading.hashtags, ...body.hashtags]) {
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }
  return { overlay, hashtagLine: tags.map((tag) => `#${tag}`).join(" ") };
}

/** Overlay line — title + writing, no hashtags. */
export function buildVideoCaptionText(
  title: string | null | undefined,
  content: string
): string {
  return splitReelOverlayCaption(title, content).overlay;
}

export function buildVideoDescriptionText(
  title: string | null | undefined,
  content: string
): string {
  const { overlay, hashtagLine } = splitReelOverlayCaption(title, content);
  return [overlay, hashtagLine].filter(Boolean).join("\n");
}
