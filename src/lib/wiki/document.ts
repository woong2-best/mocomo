import { parseWikiInfobox } from "@/lib/anime-wiki-infobox";

export const DEFAULT_WIKI_INFOBOX = `=== Work info ===
Genre | 
Studio | 
Network | 
Episodes | `;

export const DEFAULT_WIKI_DOCUMENT = `${DEFAULT_WIKI_INFOBOX}

== Overview ==

== Synopsis ==

== Characters ==

== Theme songs ==

== Trivia ==
`;

const WIKI_LINK_RE = /\[\[(?:([^\]|]+)\|)?([^\]|]+)\]\]/g;
const CHARACTERS_HEADER_RE = /^==\s*(characters|cast)\s*==$/i;
const SETTING_HEADER_RE = /^==\s*setting\s*==$/i;

export type WikiHeading = {
  label: string;
  level: 2 | 3;
};

export type SplitWikiDocument = {
  body: string;
  infobox?: string;
  charactersText?: string;
  studio?: string;
};

export function charactersToText(characters: unknown): string {
  if (!characters || !Array.isArray(characters)) return "";
  return characters
    .map((c) => (typeof c === "object" && c && "name" in c ? String((c as { name: string }).name) : ""))
    .filter(Boolean)
    .join("\n");
}

export function matchWikiHeading(line: string): WikiHeading | null {
  const trimmed = line.trim();
  const h3eq = trimmed.match(/^(={3,})\s*(.+?)\s*\1$/);
  if (h3eq) return { level: 3, label: h3eq[2].trim() };
  const h2eq = trimmed.match(/^==\s*(.+?)\s*==$/);
  if (h2eq && !trimmed.startsWith("===")) return { level: 2, label: h2eq[1].trim() };
  if (trimmed.startsWith("## ")) return { level: 2, label: trimmed.slice(3).trim() };
  if (trimmed.startsWith("# ")) return { level: 3, label: trimmed.slice(2).trim() };
  return null;
}

function isInfoboxRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("|")) return true;
  return /^[^|]+\|\s*/.test(trimmed);
}

export function isInfoboxAhead(lines: string[], start: number): boolean {
  for (let i = start + 1; i < lines.length && i <= start + 8; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const heading = matchWikiHeading(trimmed);
    if (heading?.level === 2) return false;
    if (heading?.level === 3) continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("|") || /^[^|]+\|\s*/.test(trimmed)) return true;
    return false;
  }
  return false;
}

export function skipInfoboxBlock(lines: string[], start: number): number {
  let i = start + 1;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    const heading = matchWikiHeading(trimmed);
    if (heading?.level === 2) return i;
    if (heading?.level === 3) {
      if (isInfoboxAhead(lines, i)) {
        i += 1;
        continue;
      }
      return i;
    }
    if (isInfoboxRow(trimmed)) {
      i += 1;
      continue;
    }
    return i;
  }
  return i;
}

export function extractInfoboxSource(markdown: string): { infobox: string; body: string } {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const keep: string[] = [];
  const box: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const heading = matchWikiHeading(lines[i]);
    if (heading?.level === 3 && isInfoboxAhead(lines, i)) {
      const end = skipInfoboxBlock(lines, i);
      box.push(...lines.slice(i, end));
      i = end;
      continue;
    }
    keep.push(lines[i]);
    i += 1;
  }

  return {
    infobox: box.join("\n").trim(),
    body: keep.join("\n").replace(/^\n+/, "").replace(/\n{3,}/g, "\n\n").trim(),
  };
}

export function extractWikiLinkTargets(source: string | null | undefined): string[] {
  if (!source) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  const re = new RegExp(WIKI_LINK_RE.source, "g");
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    const target = (match[2] ?? "").trim();
    if (!target || seen.has(target)) continue;
    seen.add(target);
    out.push(target);
  }
  return out;
}

export function extractWikiHeadings(source: string | null | undefined): WikiHeading[] {
  if (!source) return [];
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const headings: WikiHeading[] = [];
  let i = 0;
  while (i < lines.length) {
    const heading = matchWikiHeading(lines[i]);
    if (heading?.level === 3 && isInfoboxAhead(lines, i)) {
      i = skipInfoboxBlock(lines, i);
      continue;
    }
    if (heading) headings.push(heading);
    i += 1;
  }
  return headings;
}

function sectionBody(lines: string[], headerIndex: number): string {
  const collected: string[] = [];
  for (let i = headerIndex + 1; i < lines.length; i += 1) {
    const heading = matchWikiHeading(lines[i]);
    if (heading?.level === 2) break;
    if (heading?.level === 3 && isInfoboxAhead(lines, i)) break;
    collected.push(lines[i]);
  }
  return collected.join("\n").trim();
}

function extractCharactersText(markdown: string): string | undefined {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (!CHARACTERS_HEADER_RE.test(lines[i].trim())) continue;
    const raw = sectionBody(lines, i);
    if (!raw) return undefined;
    const names = raw
      .split("\n")
      .map((line) =>
        line
          .replace(/^[-*•]\s+/, "")
          .replace(/\[\[(?:[^\]|]+\|)?([^\]|]+)\]\]/g, "$1")
          .replace(/\*\*/g, "")
          .trim()
      )
      .filter(Boolean);
    return names.length ? names.join("\n") : undefined;
  }
  return undefined;
}

function extractStudio(infobox: string | undefined): string | undefined {
  if (!infobox) return undefined;
  const sections = parseWikiInfobox(infobox);
  for (const section of sections) {
    for (const row of section.rows) {
      if (row.label.trim().toLowerCase() === "studio") {
        const value = row.value.replace(/\[\[(?:[^\]|]+\|)?([^\]|]+)\]\]/g, "$1").trim();
        return value || undefined;
      }
    }
  }
  return undefined;
}

export function splitWikiDocument(markdown: string): SplitWikiDocument {
  const { infobox, body } = extractInfoboxSource(markdown);
  return {
    body: body || markdown.trim(),
    infobox: infobox || undefined,
    charactersText: extractCharactersText(markdown),
    studio: extractStudio(infobox || undefined),
  };
}

export function composeWikiDocument(fields: {
  synopsis?: string | null;
  worldInfo?: string | null;
  infobox?: string | null;
  charactersText?: string | null;
}): string {
  const synopsis = (fields.synopsis ?? "").trim();
  const worldInfo = (fields.worldInfo ?? "").trim();
  const infobox = (fields.infobox ?? "").trim();
  const charactersText = (fields.charactersText ?? "").trim();
  const parts: string[] = [];

  const synopsisHasInfobox = Boolean(extractInfoboxSource(synopsis).infobox);
  if (infobox && !synopsisHasInfobox) parts.push(infobox);
  if (synopsis) parts.push(synopsis);

  if (worldInfo && !synopsis.includes(worldInfo)) {
    const hasSetting = synopsis.split("\n").some((line) => SETTING_HEADER_RE.test(line.trim()));
    parts.push(hasSetting ? worldInfo : `== Setting ==\n\n${worldInfo}`);
  }

  const hasCharacters = synopsis.split("\n").some((line) => CHARACTERS_HEADER_RE.test(line.trim()));
  if (charactersText && !hasCharacters) {
    parts.push(`== Characters ==\n\n${charactersText}`);
  }

  if (parts.length === 0) return DEFAULT_WIKI_DOCUMENT;
  return parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function hasCharactersHeading(source: string | null | undefined): boolean {
  if (!source) return false;
  return source.split("\n").some((line) => CHARACTERS_HEADER_RE.test(line.trim()));
}
