import { englishText } from "@/i18n/messages";

/** Namu-style infobox text parser — mirrors web `anime-wiki-infobox.ts`. */

export function defaultWikiInfoboxSectionTitle(_locale?: string): string {
  return englishText("m.anime.work_info");
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

export const DEFAULT_WIKI_INFOBOX_TITLE = "Work info";

export const DEFAULT_WIKI_INFOBOX = `=== ${DEFAULT_WIKI_INFOBOX_TITLE} ===
Studio | 
Network | 
Episodes | `;

export function defaultWikiInfoboxSections(): WikiInfoboxSection[] {
  return [
    {
      title: DEFAULT_WIKI_INFOBOX_TITLE,
      rows: [
        { label: "Studio", value: "" },
        { label: "Network", value: "" },
        { label: "Episodes", value: "" },
      ],
    },
  ];
}

export function serializeWikiInfobox(sections: WikiInfoboxSection[]): string {
  return sections
    .map((section) => {
      const title = section.title.trim() || DEFAULT_WIKI_INFOBOX_TITLE;
      const rows = section.rows
        .filter((row) => row.label.trim())
        .map((row) => {
          const lines = (row.value ?? "").split("\n");
          return lines
            .map((line, index) => (index === 0 ? `${row.label.trim()} | ${line}` : `| ${line}`))
            .join("\n");
        });
      if (rows.length === 0) return "";
      return `=== ${title} ===\n${rows.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function infoboxSectionsFromSource(
  source: string | null | undefined,
  locale?: string
): WikiInfoboxSection[] {
  const parsed = parseWikiInfobox(source, locale);
  return parsed.length > 0 ? parsed : defaultWikiInfoboxSections();
}

export function mergeStudioIntoInfobox(
  source: string | null | undefined,
  studio: string | null | undefined,
  locale?: string
): string {
  const value = studio?.trim() ?? "";
  const sections = infoboxSectionsFromSource(source, locale);
  const studioRow = sections
    .flatMap((section) => section.rows)
    .find((row) => row.label.trim().toLowerCase() === "studio");
  if (studioRow) {
    if (!studioRow.value.trim() && value) studioRow.value = value;
    return serializeWikiInfobox(sections);
  }
  if (!value) return serializeWikiInfobox(sections);
  sections[0] ??= { title: DEFAULT_WIKI_INFOBOX_TITLE, rows: [] };
  sections[0].rows.unshift({ label: "Studio", value });
  return serializeWikiInfobox(sections);
}
