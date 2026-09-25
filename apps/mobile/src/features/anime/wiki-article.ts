export type WikiArticleSection = {
  id: string;
  label: string;
  level: 1 | 2;
  number: string;
  body: string;
};

function headingId(prefix: string, text: string): string {
  const slug =
    text
      .toLowerCase()
      .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, "$2")
      .replace(/[^\w가-힣\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "section";
  return `${prefix}-${slug}`;
}

export function characterNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) out.push(item.trim());
    else if (item && typeof item === "object" && "name" in item) {
      const name = String((item as { name?: unknown }).name ?? "").trim();
      if (name) out.push(name);
    }
  }
  return out.slice(0, 24);
}

/**
 * Split wiki markdown into numbered namu-style sections.
 * `#` = 1. 개요, `##` = 1.1 하위.
 */
export function parseWikiArticle(
  source: string | null | undefined,
  idPrefix: string
): { lead: string; sections: WikiArticleSection[] } {
  const text = (source ?? "").replace(/\r\n/g, "\n");
  if (!text.trim()) return { lead: "", sections: [] };

  const lines = text.split("\n");
  const sections: Omit<WikiArticleSection, "number">[] = [];
  let lead = "";
  let current: { label: string; level: 1 | 2; body: string } | null = null;

  const flush = () => {
    if (!current) return;
    const body = current.body.trim();
    const label = current.label.trim();
    if (!label && !body) {
      current = null;
      return;
    }
    if (!label) {
      lead = lead ? `${lead}\n\n${body}` : body;
      current = null;
      return;
    }
    sections.push({
      id: headingId(idPrefix, label),
      label,
      level: current.level,
      body,
    });
    current = null;
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+)\s*$/);
    if (h2) {
      flush();
      current = { label: h2[1].trim(), level: 2, body: "" };
      continue;
    }
    const h1 = line.match(/^#\s+(.+)\s*$/);
    if (h1) {
      flush();
      current = { label: h1[1].trim(), level: 1, body: "" };
      continue;
    }
    if (!current) {
      lead += (lead ? "\n" : "") + line;
      continue;
    }
    current.body += (current.body ? "\n" : "") + line;
  }
  flush();

  let n1 = 0;
  let n2 = 0;
  const numbered: WikiArticleSection[] = sections.map((sec) => {
    if (sec.level === 1) {
      n1 += 1;
      n2 = 0;
      return { ...sec, number: String(n1) };
    }
    if (n1 === 0) n1 = 1;
    n2 += 1;
    return { ...sec, number: `${n1}.${n2}` };
  });

  return { lead: lead.trim(), sections: numbered };
}

export function continueSectionNumbers(
  sections: WikiArticleSection[],
  startFrom: WikiArticleSection[]
): WikiArticleSection[] {
  let n1 = 0;
  for (const s of startFrom) {
    if (s.level === 1) n1 = Math.max(n1, Number(s.number.split(".")[0]) || 0);
  }
  let n2 = 0;
  return sections.map((sec) => {
    if (sec.level === 1) {
      n1 += 1;
      n2 = 0;
      return { ...sec, number: String(n1) };
    }
    if (n1 === 0) n1 = 1;
    n2 += 1;
    return { ...sec, number: `${n1}.${n2}` };
  });
}
