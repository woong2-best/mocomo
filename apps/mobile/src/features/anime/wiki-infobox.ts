import { translate } from "@/i18n/runtime";

/** Namu-style infobox text parser — mirrors web `anime-wiki-infobox.ts`. */

export function defaultWikiInfoboxSectionTitle(_locale?: string): string {
  return translate("m.anime.work_info");
}

export type WikiInfoboxRow = {
  label: string;
  value: string;
};

export type WikiInfoboxSection = {
  title: string;
  rows: WikiInfoboxRow[];
};

export const WIKI_INFOBOX_HELP = `=== Work info ===
Genre | Action
Studio | WIT STUDIO
Director | ...`;

/** Korean/JP IME often inserts a fullwidth pipe or leftover composition marks. */
export function normalizeInfoboxSource(source: string): string {
  return source
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/｜/g, "|");
}

export function parseWikiInfobox(
  source: string | null | undefined,
  locale?: string
): WikiInfoboxSection[] {
  if (!source?.trim()) return [];

  const sections: WikiInfoboxSection[] = [];
  let current: WikiInfoboxSection | null = null;
  let lastRow: WikiInfoboxRow | null = null;

  for (const rawLine of normalizeInfoboxSource(source).split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("//")) continue;

    const sectionMatch = trimmed.match(/^={2,}\s*(.+?)\s*={2,}$/);
    if (sectionMatch) {
      current = { title: sectionMatch[1].trim(), rows: [] };
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
        current = { title: defaultWikiInfoboxSectionTitle(locale), rows: [] };
        sections.push(current);
      }
      const row = { label: rowMatch[1].trim(), value: rowMatch[2].trim() };
      current.rows.push(row);
      lastRow = row;
    }
  }

  return sections.filter((s) => s.rows.length > 0);
}
