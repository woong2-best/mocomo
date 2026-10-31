/**
 * Keep wrap/paginate math in sync with src/lib/reels/text-pages.ts.
 * Mobile pads also clear Reels chrome (back, rail, author) so a text-only
 * note never sits under those overlays.
 */

import { splitPostCaptionAndHashtags } from "@/lib/post-hashtags";

export const NOTE_LINE_PX = 32;
export const NOTE_INSET_PX = 0;
/** ReelsScreen header: 4 + 40 back + 8 pad + 8 gap under the chevron. */
export const NOTE_CHROME_BELOW_INSET_PX = 60;
/**
 * Rail is `right: 10` + 28 icon + count. Keep a gap so digits cannot
 * paint under like / comment / save / share / flag.
 */
export const NOTE_PAD_RIGHT_PX = 96;
/** Author row (`bottom: 28` + 36 avatar + hashtag line) above the profile. */
export const NOTE_PAD_BOTTOM_PX = 112;
export const NOTE_PAD_LEFT_PX = 20;
/** @deprecated Use noteSafePads().top — kept so older callers still compile. */
export const NOTE_PAD_TOP_PX = NOTE_CHROME_BELOW_INSET_PX;
export const NOTE_JAMO_PX = 14.7;
export const NOTE_HANGUL_PX = 14.7;
/** Wide enough that a row of 1s cannot paint past the measured box. */
export const NOTE_LATIN_PX = 13.2;
export const NOTE_SPACE_PX = 4.13;
export const NOTE_UNIT_PX = 8.5;

export type NoteSafePads = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

/** Text box inside the red safe frame on a text reel. */
export function noteSafePads(topInset = 0): NoteSafePads {
  return {
    top: topInset + NOTE_CHROME_BELOW_INSET_PX,
    right: NOTE_PAD_RIGHT_PX,
    bottom: NOTE_PAD_BOTTOM_PX,
    left: NOTE_PAD_LEFT_PX,
  };
}

export type NotePageBudget = {
  unitsPerLine: number;
  linesPerPage: number;
  lineWidthPx?: number;
  jamoPx?: number;
  hangulPx?: number;
  latinPx?: number;
  spacePx?: number;
};

export function notePageBudget(
  frameWidth: number,
  frameHeight: number,
  pads?: Partial<NoteSafePads>
): NotePageBudget {
  const box = { ...noteSafePads(), ...pads };
  const paperW = Math.max(0, frameWidth - NOTE_INSET_PX * 2);
  const paperH = Math.max(0, frameHeight - NOTE_INSET_PX * 2);
  const textW = Math.max(80, paperW - box.left - box.right);
  const textH = Math.max(NOTE_LINE_PX, paperH - box.top - box.bottom);
  return {
    unitsPerLine: Math.max(20, Math.floor(textW / NOTE_UNIT_PX)),
    linesPerPage: Math.max(8, Math.floor(textH / NOTE_LINE_PX)),
    lineWidthPx: textW,
    jamoPx: NOTE_JAMO_PX,
    hangulPx: NOTE_HANGUL_PX,
    latinPx: NOTE_LATIN_PX,
    spacePx: NOTE_SPACE_PX,
  };
}

function charUnits(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0x11ff) return 2;
  if (code >= 0x2e80 && code <= 0x9fff) return 2;
  if (code >= 0xac00 && code <= 0xd7af) return 2;
  if (code >= 0xf900 && code <= 0xfaff) return 2;
  if (code >= 0xff00 && code <= 0xffef) return 2;
  return 1;
}

function glyphPx(ch: string, budget: NotePageBudget): number {
  if (ch === " ") return budget.spacePx ?? NOTE_SPACE_PX;
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x3130 && code <= 0x318f) return budget.jamoPx ?? NOTE_JAMO_PX;
  if (charUnits(ch) === 2) return budget.hangulPx ?? NOTE_HANGUL_PX;
  return budget.latinPx ?? NOTE_LATIN_PX;
}

function wrapReelNoteLinePx(line: string, budget: NotePageBudget): string[] {
  const max = budget.lineWidthPx ?? 0;
  if (line.length === 0) return [""];
  const chars = Array.from(line);
  const out: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let width = 0;
    let end = start;
    let lastSpace = -1;
    while (end < chars.length) {
      const next = glyphPx(chars[end] ?? "", budget);
      if (width + next > max && end > start) break;
      width += next;
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

function wrapReelNoteLine(line: string, unitsPerLine: number): string[] {
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

export function reelNoteText(
  title: string | null | undefined,
  content: string | null | undefined
): string {
  const body = splitPostCaptionAndHashtags(
    (content ?? "").replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "")
  ).caption;
  const heading = splitPostCaptionAndHashtags(title ?? "").caption;
  if (!heading) return body;
  if (!body) return heading;
  if (body.startsWith(heading)) return body;
  return `${heading}\n\n${body}`;
}

export function wrapReelNoteVisual(raw: string, budget: NotePageBudget): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!text.trim()) return [];
  const visual: string[] = [];
  for (const line of text.split("\n")) {
    visual.push(
      ...(budget.lineWidthPx != null
        ? wrapReelNoteLinePx(line, budget)
        : wrapReelNoteLine(line, budget.unitsPerLine))
    );
  }
  return visual;
}

export function paginateReelNote(raw: string, budget: NotePageBudget): string[] {
  const visual = wrapReelNoteVisual(raw, budget);
  if (visual.length === 0) return [];
  const pages: string[] = [];
  for (let i = 0; i < visual.length; i += budget.linesPerPage) {
    pages.push(visual.slice(i, i + budget.linesPerPage).join("\n"));
  }
  return pages;
}

export function reelNotePages(
  title: string | null | undefined,
  content: string | null | undefined
): string[] {
  const text = reelNoteText(title, content);
  if (text.trim()) return [text];
  const { hashtagLine } = splitPostCaptionAndHashtags(
    [title ?? "", content ?? ""].join("\n")
  );
  return hashtagLine ? [""] : [];
}

/**
 * Note slides are only for text-only posts.
 * Photo/video posts keep the writing in the caption overlay — no extra black page.
 */
export function reelNotePagesForViewer(
  title: string | null | undefined,
  content: string | null | undefined,
  hasVisualMedia: boolean
): string[] {
  if (hasVisualMedia) return [];
  return reelNotePages(title, content);
}

type NoteSlide = {
  id: string;
  mediaType?: string;
  noteText?: string | null;
};

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
