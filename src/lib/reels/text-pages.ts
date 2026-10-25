/**
 * Split a post's typed text into reel-sized note pages.
 * Explicit line breaks stay. Long lines wrap on a space when they can,
 * otherwise on a character, so a page fills the phone frame without overflowing it.
 *
 * The server sends the full note as one slide. The viewer measures the card
 * and paginates with `notePageBudget` so each page reaches the author row.
 */

/** Matches the ruled note: 17px type on a 32px line. */
export const NOTE_LINE_PX = 32;
export const NOTE_INSET_PX = 12;
export const NOTE_PAD_TOP_PX = 12;
/** Room for the author row sitting on the bottom of the paper. */
export const NOTE_PAD_BOTTOM_PX = 112;
export const NOTE_PAD_LEFT_PX = 20;
/** Clears the action rail on the right of the paper. */
export const NOTE_PAD_RIGHT_PX = 56;
/** One latin column. Hangul and other fullwidth glyphs count as two. */
export const NOTE_UNIT_PX = 8.5;

export type NotePageBudget = {
  unitsPerLine: number;
  linesPerPage: number;
};

export function notePageBudget(frameWidth: number, frameHeight: number): NotePageBudget {
  const paperW = Math.max(0, frameWidth - NOTE_INSET_PX * 2);
  const paperH = Math.max(0, frameHeight - NOTE_INSET_PX * 2);
  const textW = Math.max(80, paperW - NOTE_PAD_LEFT_PX - NOTE_PAD_RIGHT_PX);
  const textH = Math.max(NOTE_LINE_PX, paperH - NOTE_PAD_TOP_PX - NOTE_PAD_BOTTOM_PX);
  return {
    unitsPerLine: Math.max(20, Math.floor(textW / NOTE_UNIT_PX)),
    linesPerPage: Math.max(8, Math.floor(textH / NOTE_LINE_PX)),
  };
}

/** Desktop reel card, used until the viewer has measured the frame. */
export const NOTE_PAGE_FALLBACK = notePageBudget(420, 860);

function charUnits(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0x11ff) return 2;
  if (code >= 0x2e80 && code <= 0x9fff) return 2;
  if (code >= 0xac00 && code <= 0xd7af) return 2;
  if (code >= 0xf900 && code <= 0xfaff) return 2;
  if (code >= 0xff00 && code <= 0xffef) return 2;
  return 1;
}

/** Wrap one logical line into visual lines. An empty line stays empty. */
export function wrapReelNoteLine(
  line: string,
  unitsPerLine: number = NOTE_PAGE_FALLBACK.unitsPerLine
): string[] {
  if (line.length === 0) return [""];
  const chars = Array.from(line);
  const out: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let units = 0;
    let end = start;
    let lastSpace = -1;
    while (end < chars.length) {
      const next = charUnits(chars[end] ?? "");
      if (units + next > unitsPerLine && end > start) break;
      units += next;
      if (chars[end] === " ") lastSpace = end;
      end += 1;
    }
    if (end < chars.length && lastSpace > start) {
      out.push(chars.slice(start, lastSpace).join("").trimEnd());
      start = lastSpace + 1;
    } else {
      out.push(chars.slice(start, end).join(""));
      start = end;
    }
  }
  return out.length > 0 ? out : [""];
}

/** Title, then the body, keeping the author's line breaks. */
export function reelNoteText(
  title: string | null | undefined,
  content: string | null | undefined
): string {
  const body = (content ?? "").replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  const heading = (title ?? "").trim();
  if (!heading) return body;
  if (!body) return heading;
  if (body.startsWith(heading)) return body;
  return `${heading}\n\n${body}`;
}

export function paginateReelNote(raw: string, budget: NotePageBudget = NOTE_PAGE_FALLBACK): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!text.trim()) return [];
  const visual: string[] = [];
  for (const line of text.split("\n")) {
    visual.push(...wrapReelNoteLine(line, budget.unitsPerLine));
  }
  const pages: string[] = [];
  for (let i = 0; i < visual.length; i += budget.linesPerPage) {
    pages.push(visual.slice(i, i + budget.linesPerPage).join("\n"));
  }
  return pages;
}

/** One slide of the full note. The viewer splits it once the frame is measured. */
export function reelNotePages(
  title: string | null | undefined,
  content: string | null | undefined
): string[] {
  const text = reelNoteText(title, content);
  return text.trim() ? [text] : [];
}

type NoteSlide = {
  id: string;
  mediaType?: string;
  noteText?: string | null;
};

/** Turn each full-text note into pages that fill `budget`. Photos and videos stay put. */
export function expandReelNoteSlides<T extends NoteSlide>(
  slides: T[],
  budget: NotePageBudget
): T[] {
  const out: T[] = [];
  for (const slide of slides) {
    if (slide.mediaType !== "NOTE") {
      out.push(slide);
      continue;
    }
    const pages = paginateReelNote(slide.noteText ?? "", budget);
    if (pages.length <= 1) {
      out.push(pages.length === 1 ? { ...slide, noteText: pages[0] } : slide);
      continue;
    }
    pages.forEach((noteText, index) => {
      out.push({
        ...slide,
        id: index === 0 ? slide.id : `${slide.id}:p${index}`,
        noteText,
      });
    });
  }
  return out;
}

export function groupReelSlides<T extends { postId: string; runId?: string }>(
  items: T[]
): { key: string; postId: string; slides: T[] }[] {
  const groups: { key: string; postId: string; slides: T[] }[] = [];
  for (const item of items) {
    const key = item.runId || item.postId;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.slides.push(item);
    else groups.push({ key, postId: item.postId, slides: [item] });
  }
  return groups;
}
