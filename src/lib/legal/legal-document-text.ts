import type { LegalBlock, LegalDocument } from "@/lib/legal-content";

function headingIdSuffix(id?: string): string {
  return id ? ` {#${id}}` : "";
}

function parseHeadingId(line: string): { text: string; id?: string } {
  const match = /^(.*?)\s*\{#([A-Za-z0-9_-]+)\}\s*$/.exec(line);
  if (!match) return { text: line.trim() };
  return { text: match[1]?.trim() ?? "", id: match[2] };
}

function serializeTable(block: Extract<LegalBlock, { type: "table" }>): string {
  const header = `| ${block.headers.join(" | ")} |`;
  const sep = `| ${block.headers.map(() => "---").join(" | ")} |`;
  const rows = block.rows.map((row) => `| ${row.join(" | ")} |`);
  return [header, sep, ...rows].join("\n");
}

export function serializeLegalBlocks(blocks: LegalBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case "h2":
        parts.push(`## ${block.text}${headingIdSuffix(block.id)}`);
        break;
      case "h3":
        parts.push(`### ${block.text}${headingIdSuffix(block.id)}`);
        break;
      case "p":
        parts.push(block.text);
        break;
      case "ul":
        parts.push(block.items.map((item) => `- ${item}`).join("\n"));
        break;
      case "hr":
        parts.push("---");
        break;
      case "table":
        parts.push(serializeTable(block));
        break;
      default:
        break;
    }
  }
  return parts.join("\n\n").trim();
}

export function parseLegalBlocks(source: string): LegalBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: LegalBlock[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const text = buf.join("\n").trim();
    if (text) blocks.push({ type: "p", text });
    buf.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed === "---") {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("### ")) {
      const parsed = parseHeadingId(trimmed.slice(4));
      blocks.push({ type: "h3", text: parsed.text, id: parsed.id });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("## ")) {
      const parsed = parseHeadingId(trimmed.slice(3));
      blocks.push({ type: "h2", text: parsed.text, id: parsed.id });
      i += 1;
      continue;
    }

    if (trimmed.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        tableLines.push((lines[i] ?? "").trim());
        i += 1;
      }
      const parsed = parseMarkdownTable(tableLines);
      if (parsed) blocks.push(parsed);
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const itemLine = (lines[i] ?? "").trim();
        if (itemLine.startsWith("- ") || itemLine.startsWith("* ")) {
          items.push(itemLine.slice(2).trim());
          i += 1;
          continue;
        }
        break;
      }
      if (items.length) blocks.push({ type: "ul", items });
      continue;
    }

    const para: string[] = [trimmed];
    i += 1;
    while (i < lines.length) {
      const next = (lines[i] ?? "").trim();
      if (
        !next ||
        next === "---" ||
        next.startsWith("## ") ||
        next.startsWith("### ") ||
        next.startsWith("|") ||
        next.startsWith("- ") ||
        next.startsWith("* ")
      ) {
        break;
      }
      para.push(next);
      i += 1;
    }
    flushParagraph(para);
  }

  return blocks;
}

function parseMarkdownTable(lines: string[]): Extract<LegalBlock, { type: "table" }> | null {
  const split = (line: string) =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());
  const rows = lines.map(split).filter((row) => row.some((cell) => cell.length > 0));
  if (rows.length < 2) return null;
  const headers = rows[0] ?? [];
  const body = rows.slice(1).filter((row) => !row.every((cell) => /^:?-+:?$/.test(cell)));
  return { type: "table", headers, rows: body };
}

export function legalDocumentToEditorFields(doc: LegalDocument): {
  title: string;
  intro: string;
  bodyText: string;
} {
  return {
    title: doc.title,
    intro: doc.intro ?? "",
    bodyText: serializeLegalBlocks(doc.blocks),
  };
}

export function editorFieldsToLegalDocument(input: {
  slug: string;
  title: string;
  intro: string;
  bodyText: string;
  updatedAt: string;
  version?: string;
}): LegalDocument {
  return {
    slug: input.slug,
    title: input.title.trim() || "Untitled",
    intro: input.intro.trim() || undefined,
    updatedAt: input.updatedAt,
    version: input.version,
    blocks: parseLegalBlocks(input.bodyText),
  };
}
