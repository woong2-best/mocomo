/**
 * Keep in sync with src/lib/reels/text-pages.ts.
 * Split typed post text into reel-sized note pages without overflowing the frame.
 */

const UNITS_PER_LINE = 32;
const LINES_PER_PAGE = 11;

function charUnits(ch: string): number {
  const code = ch.codePointAt(0) ?? 0;
  if (code >= 0x1100 && code <= 0x11ff) return 2;
  if (code >= 0x2e80 && code <= 0x9fff) return 2;
  if (code >= 0xac00 && code <= 0xd7af) return 2;
  if (code >= 0xf900 && code <= 0xfaff) return 2;
  if (code >= 0xff00 && code <= 0xffef) return 2;
  return 1;
}

function wrapReelNoteLine(line: string): string[] {
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
      if (units + next > UNITS_PER_LINE && end > start) break;
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
  const body = (content ?? "").replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  const heading = (title ?? "").trim();
  if (!heading) return body;
  if (!body) return heading;
  if (body.startsWith(heading)) return body;
  return `${heading}\n\n${body}`;
}

export function paginateReelNote(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").replace(/^\n+|\n+$/g, "");
  if (!text.trim()) return [];
  const visual: string[] = [];
  for (const line of text.split("\n")) {
    visual.push(...wrapReelNoteLine(line));
  }
  const pages: string[] = [];
  for (let i = 0; i < visual.length; i += LINES_PER_PAGE) {
    pages.push(visual.slice(i, i + LINES_PER_PAGE).join("\n"));
  }
  return pages;
}

export function reelNotePages(
  title: string | null | undefined,
  content: string | null | undefined
): string[] {
  return paginateReelNote(reelNoteText(title, content));
}
