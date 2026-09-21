export type WikiBookPage = {
  id: string;
  /** Shown in page chrome / indicator label */
  label: string;
  /** Wiki markdown body (empty for character-only pages) */
  source: string;
  /** Character names for the cast page */
  characters?: string[];
  /** Overview page also shows title/meta outside markdown */
  kind: "overview" | "plot" | "details" | "cast";
};

function characterNames(raw: unknown): string[] {
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

type Section = { title: string; body: string };

/** Split `# heading` blocks; keep `{{collapse|...}}` attached to preceding section when possible. */
function splitSections(source: string | null | undefined): Section[] {
  const text = (source ?? "").trim();
  if (!text) return [];

  const lines = text.split("\n");
  const sections: Section[] = [];
  let current: Section | null = null;

  const flush = () => {
    if (!current) return;
    current.body = current.body.trim();
    sections.push(current);
    current = null;
  };

  for (const line of lines) {
    const h = line.match(/^#\s+(.+)\s*$/);
    if (h) {
      flush();
      current = { title: h[1].trim(), body: "" };
      continue;
    }
    if (!current) current = { title: "", body: "" };
    current.body += (current.body ? "\n" : "") + line;
  }
  flush();
  return sections;
}

function classifySection(title: string): WikiBookPage["kind"] | "other" {
  const t = title.replace(/\s+/g, "");
  if (!t || /개요|소개|개관|overview/i.test(t)) return "overview";
  if (/줄거리|시놉시스|스토리|synopsis|plot/i.test(t)) return "plot";
  if (/등장|인물|캐릭터|character/i.test(t)) return "cast";
  if (/특징|상세|스펙|정보|수록|테마|ost|밴드|세계관|호흡|거인|철학|핵심/i.test(t)) return "details";
  return "other";
}

/**
 * Build ebook pages: 개요 → 줄거리 → 특징/세계관 → 등장인물/스포일러.
 * Missing sections are omitted so indicator count stays honest.
 */
export function buildWikiBookPages(opts: {
  title: string;
  synopsis: string | null | undefined;
  worldInfo: string | null | undefined;
  characters: unknown;
}): WikiBookPage[] {
  const synSections = splitSections(opts.synopsis);
  const worldSections = splitSections(opts.worldInfo);
  const cast = characterNames(opts.characters);

  const overviewParts: string[] = [];
  const plotParts: string[] = [];
  const detailParts: string[] = [];
  const castParts: string[] = [];

  const bucket = (sec: Section, force?: WikiBookPage["kind"]) => {
    const kind = force ?? classifySection(sec.title);
    const block =
      sec.title && kind !== "overview"
        ? `# ${sec.title}\n\n${sec.body}`.trim()
        : sec.body.trim();
    if (!block && kind !== "overview") return;

    // Spoilers / collapse always land on cast page
    if (/\{\{collapse\|/i.test(block) && kind !== "cast") {
      const collapses = block.match(/\{\{collapse\|[^|]+\|[\s\S]*?\}\}/g) ?? [];
      for (const c of collapses) castParts.push(c);
      const without = block.replace(/\{\{collapse\|[^|]+\|[\s\S]*?\}\}/g, "").trim();
      if (without) {
        if (kind === "plot") plotParts.push(without);
        else if (kind === "overview") overviewParts.push(without);
        else detailParts.push(without);
      }
      return;
    }

    if (kind === "overview") overviewParts.push(block);
    else if (kind === "plot") plotParts.push(block);
    else if (kind === "cast") castParts.push(block);
    else detailParts.push(sec.title ? `# ${sec.title}\n\n${sec.body}`.trim() : block);
  };

  if (synSections.length === 0 && opts.synopsis?.trim()) {
    overviewParts.push(opts.synopsis.trim());
  } else {
    for (const sec of synSections) bucket(sec);
  }

  for (const sec of worldSections) bucket(sec, "details");

  const pages: WikiBookPage[] = [];

  pages.push({
    id: "overview",
    label: "개요",
    kind: "overview",
    source: overviewParts.filter(Boolean).join("\n\n").trim(),
  });

  if (plotParts.some(Boolean)) {
    pages.push({
      id: "plot",
      label: "줄거리",
      kind: "plot",
      source: plotParts.filter(Boolean).join("\n\n").trim(),
    });
  }

  if (detailParts.some(Boolean)) {
    pages.push({
      id: "details",
      label: "특징",
      kind: "details",
      source: detailParts.filter(Boolean).join("\n\n").trim(),
    });
  }

  if (cast.length > 0 || castParts.some(Boolean)) {
    pages.push({
      id: "cast",
      label: "인물",
      kind: "cast",
      source: castParts.filter(Boolean).join("\n\n").trim(),
      characters: cast,
    });
  }

  // Always at least one page
  if (pages.length === 0) {
    pages.push({ id: "overview", label: "개요", kind: "overview", source: "" });
  }

  return pages;
}
