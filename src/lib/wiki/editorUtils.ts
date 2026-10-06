import type { WikiMacro } from "@/lib/wiki/macros";

export type WikiTitle = {
  id: string;
  original: string;
  english: string;
};

export type IndexedWikiTitle = WikiTitle & {
  normalizedEnglish: string;
};

export type TitleContext = {
  query: string;
  replaceStart: number;
  replaceEnd: number;
};

export type InsertResult = {
  next: string;
  caret: number;
};

const META_LINE_RE = /^\s*\[(Genre|Studio|Tags|Characters)\s*:/;
const TITLE_OPEN_RE = /^\s*\[[^\[\]]*\(([^()\[\]]*)$/;
const AFTER_CARET_CLOSE_RE = /^[^()\n\]]*\)/;

export function normalize(s: string): string {
  return s.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

export function indexWikiTitles(titles: WikiTitle[]): IndexedWikiTitle[] {
  return titles.map((title) => ({
    ...title,
    normalizedEnglish: normalize(title.english),
  }));
}

export function detectTitleContext(value: string, caret: number): TitleContext | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  const lineStart = value.lastIndexOf("\n", safeCaret - 1) + 1;
  const before = value.slice(lineStart, safeCaret);

  if (META_LINE_RE.test(before)) return null;

  const openMatch = before.match(TITLE_OPEN_RE);
  if (!openMatch) return null;

  const parenInBefore = before.lastIndexOf("(");
  if (parenInBefore < 0) return null;

  const replaceStart = lineStart + parenInBefore + 1;
  let replaceEnd = safeCaret;

  const afterOnLine = value.slice(safeCaret).split("\n")[0] ?? "";
  const closeMatch = afterOnLine.match(AFTER_CARET_CLOSE_RE);
  if (closeMatch) {
    replaceEnd = safeCaret + closeMatch[0].length - 1;
  }

  const query = value.slice(replaceStart, replaceEnd);
  if (!query.trim()) return null;

  return { query, replaceStart, replaceEnd };
}

export function searchTitles(titles: IndexedWikiTitle[], query: string): IndexedWikiTitle[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return [];

  const matched = titles
    .map((title) => {
      const idx = title.normalizedEnglish.indexOf(normalizedQuery);
      if (idx < 0) return null;
      return { title, idx, exact: title.normalizedEnglish === normalizedQuery };
    })
    .filter((row): row is { title: IndexedWikiTitle; idx: number; exact: boolean } => row !== null);

  matched.sort((a, b) => {
    if (a.exact !== b.exact) return a.exact ? -1 : 1;
    const aPrefix = a.idx === 0;
    const bPrefix = b.idx === 0;
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;
    if (a.idx !== b.idx) return a.idx - b.idx;
    if (a.title.english.length !== b.title.english.length) {
      return a.title.english.length - b.title.english.length;
    }
    return a.title.english.localeCompare(b.title.english);
  });

  return matched.slice(0, 50).map((row) => row.title);
}

export function replaceRange(
  value: string,
  start: number,
  end: number,
  inserted: string,
  caretOffset = inserted.length
): InsertResult {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  const next = value.slice(0, from) + inserted + value.slice(to);
  return { next, caret: from + caretOffset };
}

function isLineStart(value: string, index: number): boolean {
  return index <= 0 || value[index - 1] === "\n";
}

function caretAfterHeader(value: string, header: string): number | null {
  const idx = value.indexOf(header);
  if (idx < 0) return null;
  let caret = idx + header.length;
  if (value[caret] === "\n") caret += 1;
  return caret;
}

function wrapWithMacro(template: string, selected: string): InsertResult | null {
  const pipe = template.indexOf("|");
  if (pipe < 0) return null;
  const open = template.slice(0, pipe);
  const close = template.slice(pipe + 1);
  const inserted = `${open}${selected}${close}`;
  return { next: inserted, caret: inserted.length };
}

export function insertMacro(
  value: string,
  start: number,
  end: number,
  macro: WikiMacro
): InsertResult {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));

  if (macro.existingHeader) {
    const existingCaret = caretAfterHeader(value, macro.existingHeader);
    if (existingCaret !== null) {
      return { next: value, caret: existingCaret };
    }
  }

  const selected = value.slice(from, to);
  if (macro.wrapSelection && selected.length > 0) {
    const wrapped = wrapWithMacro(macro.template, selected);
    if (wrapped) {
      return replaceRange(value, from, to, wrapped.next, wrapped.caret);
    }
  }

  let template = macro.template;
  if (template.startsWith("\n") && isLineStart(value, from)) {
    template = template.slice(1);
  }

  const pipe = template.indexOf("|");
  const inserted = pipe >= 0 ? template.slice(0, pipe) + template.slice(pipe + 1) : template;
  const caretOffset = pipe >= 0 ? pipe : inserted.length;
  return replaceRange(value, from, to, inserted, caretOffset);
}

export function insertOrFocusToken(value: string, start: number, end: number, token: string): InsertResult {
  const existing = value.indexOf(token);
  if (existing >= 0) {
    return { next: value, caret: existing };
  }
  return replaceRange(value, start, end, token, token.length);
}

export function applyTitleSuggestion(
  value: string,
  context: TitleContext,
  english: string
): InsertResult {
  return replaceRange(value, context.replaceStart, context.replaceEnd, english, english.length);
}
