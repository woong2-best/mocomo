/** Namu-style infobox text parser — mirrors web `anime-wiki-infobox.ts`. */

export type WikiInfoboxRow = {
  label: string;
  value: string;
};

export type WikiInfoboxSection = {
  title: string;
  rows: WikiInfoboxRow[];
};

export function parseWikiInfobox(source: string | null | undefined): WikiInfoboxSection[] {
  if (!source?.trim()) return [];

  const sections: WikiInfoboxSection[] = [];
  let current: WikiInfoboxSection | null = null;
  let lastRow: WikiInfoboxRow | null = null;

  for (const rawLine of source.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    const sectionMatch = trimmed.match(/^===\s*(.+?)\s*===$/);
    if (sectionMatch) {
      current = { title: sectionMatch[1], rows: [] };
      sections.push(current);
      lastRow = null;
      continue;
    }

    if (trimmed.startsWith("|") && lastRow && current) {
      const cont = trimmed.replace(/^\|\s?/, "");
      lastRow.value = lastRow.value ? `${lastRow.value}\n${cont}` : cont;
      continue;
    }

    const rowMatch = trimmed.match(/^([^|]+)\|\s*(.*)$/);
    if (rowMatch) {
      if (!current) {
        current = { title: "작품 정보", rows: [] };
        sections.push(current);
      }
      const row = { label: rowMatch[1].trim(), value: rowMatch[2].trim() };
      current.rows.push(row);
      lastRow = row;
    }
  }

  return sections.filter((s) => s.rows.length > 0);
}
