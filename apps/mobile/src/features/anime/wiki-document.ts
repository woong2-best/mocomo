export const DEFAULT_WIKI_DOCUMENT = `=== Work info ===
Genre | 
Studio | 
Network | 
Episodes | 

== Overview ==

== Synopsis ==

== Characters ==

== Theme songs ==

== Trivia ==
`;

function matchHeading(line: string): { level: 2 | 3; label: string } | null {
  const trimmed = line.trim();
  const h3 = trimmed.match(/^(={3,})\s*(.+?)\s*\1$/);
  if (h3) return { level: 3, label: h3[2].trim() };
  const h2 = trimmed.match(/^==\s*(.+?)\s*==$/);
  if (h2 && !trimmed.startsWith("===")) return { level: 2, label: h2[1].trim() };
  if (trimmed.startsWith("## ")) return { level: 2, label: trimmed.slice(3).trim() };
  if (trimmed.startsWith("# ")) return { level: 3, label: trimmed.slice(2).trim() };
  return null;
}

function isInfoboxAhead(lines: string[], start: number): boolean {
  for (let i = start + 1; i < lines.length && i <= start + 8; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    const heading = matchHeading(trimmed);
    if (heading?.level === 2) return false;
    if (heading?.level === 3) continue;
    if (trimmed.startsWith("//")) continue;
    if (trimmed.startsWith("|") || /^[^|]+\|\s*/.test(trimmed)) return true;
    return false;
  }
  return false;
}

function skipInfobox(lines: string[], start: number): number {
  let i = start + 1;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    const heading = matchHeading(trimmed);
    if (heading?.level === 2) return i;
    if (heading?.level === 3) {
      if (isInfoboxAhead(lines, i)) {
        i += 1;
        continue;
      }
      return i;
    }
    if (trimmed.startsWith("//") || trimmed.startsWith("|") || /^[^|]+\|\s*/.test(trimmed)) {
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
    const heading = matchHeading(lines[i]);
    if (heading?.level === 3 && isInfoboxAhead(lines, i)) {
      const end = skipInfobox(lines, i);
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

function extractCharacters(markdown: string): string | undefined {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^==\s*(characters|cast)\s*==$/i.test(lines[i].trim())) continue;
    const names: string[] = [];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (matchHeading(lines[j])?.level === 2) break;
      const name = lines[j]
        .replace(/^[-*•]\s+/, "")
        .replace(/\[\[(?:[^\]|]+\|)?([^\]|]+)\]\]/g, "$1")
        .replace(/\*\*/g, "")
        .trim();
      if (name) names.push(name);
    }
    return names.length ? names.join("\n") : undefined;
  }
  return undefined;
}

function extractStudio(infobox: string | undefined): string | undefined {
  if (!infobox) return undefined;
  const match = infobox.match(/^Studio\s*\|\s*(.+)$/im);
  return match?.[1]?.replace(/\[\[(?:[^\]|]+\|)?([^\]|]+)\]\]/g, "$1").trim() || undefined;
}

export function splitWikiDocument(markdown: string): {
  body: string;
  infobox?: string;
  charactersText?: string;
  studio?: string;
} {
  const { infobox, body } = extractInfoboxSource(markdown);
  return {
    body: body || markdown.trim(),
    infobox: infobox || undefined,
    charactersText: extractCharacters(markdown),
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
    const hasSetting = synopsis.split("\n").some((line) => /^==\s*setting\s*==$/i.test(line.trim()));
    parts.push(hasSetting ? worldInfo : `== Setting ==\n\n${worldInfo}`);
  }
  const hasCharacters = synopsis.split("\n").some((line) => /^==\s*(characters|cast)\s*==$/i.test(line.trim()));
  if (charactersText && !hasCharacters) parts.push(`== Characters ==\n\n${charactersText}`);
  if (parts.length === 0) return DEFAULT_WIKI_DOCUMENT;
  return `${parts.join("\n\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
