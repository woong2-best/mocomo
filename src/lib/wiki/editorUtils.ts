import type { WikiMacro } from "@/lib/wiki/macros";

export type WikiTitle = {
  id: string;
  original: string;
  english: string;
};

export type IndexedWikiTitle = WikiTitle & {
  normalizedEnglish: string;
  normalizedOriginal: string;
};

export type TitleContextKind = "paren" | "wikilink";

export type TitleContext = {
  query: string;
  replaceStart: number;
  replaceEnd: number;
  kind: TitleContextKind;
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
    normalizedOriginal: normalize(title.original),
  }));
}

export function detectWikiLinkContext(value: string, caret: number): TitleContext | null {
  const safeCaret = Math.max(0, Math.min(caret, value.length));
  const before = value.slice(0, safeCaret);
  const open = before.lastIndexOf("[[");
  if (open < 0) return null;
  if (before.indexOf("]]", open) >= 0) return null;

  const inner = value.slice(open + 2, safeCaret);
  if (inner.includes("\n")) return null;

  const pipe = inner.lastIndexOf("|");
  const replaceStart = pipe >= 0 ? open + 2 + pipe + 1 : open + 2;
  let replaceEnd = safeCaret;
  const after = value.slice(safeCaret);
  const close = after.indexOf("]]");
  const newline = after.indexOf("\n");
  if (close >= 0 && (newline < 0 || close < newline)) {
    replaceEnd = safeCaret + close;
  }

  return {
    query: value.slice(replaceStart, replaceEnd),
    replaceStart,
    replaceEnd,
    kind: "wikilink",
  };
}

export function detectTitleContext(value: string, caret: number): TitleContext | null {
  const wiki = detectWikiLinkContext(value, caret);
  if (wiki) return wiki;

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

  return { query, replaceStart, replaceEnd, kind: "paren" };
}

export function searchTitles(titles: IndexedWikiTitle[], query: string): IndexedWikiTitle[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return titles.slice(0, 8);

  const matched = titles
    .map((title) => {
      const idxEn = title.normalizedEnglish.indexOf(normalizedQuery);
      const idxOrig = title.normalizedOriginal.indexOf(normalizedQuery);
      if (idxEn < 0 && idxOrig < 0) return null;
      const idx = idxEn >= 0 && idxOrig >= 0 ? Math.min(idxEn, idxOrig) : Math.max(idxEn, idxOrig);
      return {
        title,
        idx,
        exact: title.normalizedEnglish === normalizedQuery || title.normalizedOriginal === normalizedQuery,
      };
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

function materializeTemplate(template: string): { inserted: string; caretOffset: number } {
  const unescaped = template.replace(/\\\|/g, "\u0000");
  const pipe = unescaped.indexOf("|");
  const raw = pipe >= 0 ? unescaped.slice(0, pipe) + unescaped.slice(pipe + 1) : unescaped;
  const inserted = raw.replace(/\u0000/g, "|");
  const caretOffset = pipe >= 0 ? unescaped.slice(0, pipe).replace(/\u0000/g, "|").length : inserted.length;
  return { inserted, caretOffset };
}

function wrapWithMacro(template: string, selected: string): InsertResult | null {
  if (!template.includes("|") && !template.includes("\\|")) return null;
  const { inserted, caretOffset } = materializeTemplate(template);
  const next = inserted.slice(0, caretOffset) + selected + inserted.slice(caretOffset);
  return { next, caret: next.length };
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

  const { inserted, caretOffset } = materializeTemplate(template);
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
  if (context.kind === "wikilink") {
    const after = value.slice(context.replaceEnd);
    const needsClose = !after.startsWith("]]");
    const inserted = needsClose ? `${english}]]` : english;
    return replaceRange(value, context.replaceStart, context.replaceEnd, inserted, english.length);
  }
  return replaceRange(value, context.replaceStart, context.replaceEnd, english, english.length);
}
