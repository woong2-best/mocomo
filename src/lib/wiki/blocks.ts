import { isInfoboxAhead, matchWikiHeading, skipInfoboxBlock } from "@/lib/wiki/document";
import { parseTweetUrl } from "@/lib/wiki/markup";
import { parseWikiVideoLine, type WikiVideo } from "@/lib/wiki/media";

export type WikiBlock =
  | { type: "heading"; level: 2 | 3; label: string }
  | { type: "youtube"; id: string; source: string }
  | { type: "video"; video: WikiVideo; source: string }
  | { type: "tweet"; url: string; handle: string; id: string }
  | { type: "table"; rows: string[][] }
  | { type: "collapse"; title: string; body: string }
  | { type: "fold"; title: string; body: string }
  | { type: "quote"; text: string }
  | { type: "paragraph"; text: string };

function isMarkdownTableLine(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

function parseTableBlock(lines: string[]): string[][] | null {
  if (lines.length < 1) return null;
  const rows = lines
    .filter((l) => l.includes("|"))
    .map((l) =>
      l
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0)
    );
  if (rows.length < 1) return null;
  if (rows[1]?.every((c) => /^[-:]+$/.test(c))) rows.splice(1, 1);
  return rows;
}

function readCollapse(lines: string[], start: number): { block: WikiBlock; next: number } | null {
  const first = lines[start].trim();
  if (!first.startsWith("{{collapse|")) return null;
  let raw = first;
  let i = start;
  while (!raw.trim().endsWith("}}") && i + 1 < lines.length) {
    i += 1;
    raw += `\n${lines[i]}`;
  }
  const match = raw.trim().match(/^\{\{collapse\|([^|]+)\|([\s\S]+)\}\}$/);
  if (!match) return null;
  return { block: { type: "collapse", title: match[1], body: match[2] }, next: i + 1 };
}

function readFold(lines: string[], start: number): { block: WikiBlock; next: number } | null {
  const open = lines[start].trim().match(/^\[fold:(.+)\]$/i);
  if (!open) return null;
  const body: string[] = [];
  let i = start + 1;
  while (i < lines.length && !/^\[\/fold\]$/i.test(lines[i].trim())) {
    body.push(lines[i]);
    i += 1;
  }
  return { block: { type: "fold", title: open[1].trim(), body: body.join("\n") }, next: i < lines.length ? i + 1 : i };
}

export function parseWikiBlocks(source: string): WikiBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: WikiBlock[] = [];
  const para: string[] = [];
  let i = 0;

  const flushPara = () => {
    const text = para.join("\n").trim();
    if (text) blocks.push({ type: "paragraph", text });
    para.length = 0;
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushPara();
      i += 1;
      continue;
    }

    const collapse = readCollapse(lines, i);
    if (collapse) {
      flushPara();
      blocks.push(collapse.block);
      i = collapse.next;
      continue;
    }

    const fold = readFold(lines, i);
    if (fold) {
      flushPara();
      blocks.push(fold.block);
      i = fold.next;
      continue;
    }

    if (trimmed.startsWith(">")) {
      flushPara();
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push({ type: "quote", text: quote.join("\n") });
      continue;
    }

    const heading = matchWikiHeading(trimmed);
    if (heading) {
      if (heading.level === 3 && isInfoboxAhead(lines, i)) {
        flushPara();
        i = skipInfoboxBlock(lines, i);
        continue;
      }
      flushPara();
      blocks.push({ type: "heading", level: heading.level, label: heading.label });
      i += 1;
      continue;
    }

    const tweet = !trimmed.includes(" ") ? parseTweetUrl(trimmed) : null;
    if (tweet) {
      flushPara();
      blocks.push({ type: "tweet", ...tweet });
      i += 1;
      continue;
    }

    const video = parseWikiVideoLine(trimmed);
    if (video) {
      flushPara();
      if (video.kind === "youtube") {
        blocks.push({ type: "youtube", id: video.id, source: trimmed });
      } else {
        blocks.push({ type: "video", video, source: trimmed });
      }
      i += 1;
      continue;
    }

    if (isMarkdownTableLine(trimmed)) {
      flushPara();
      const tableLines: string[] = [];
      while (i < lines.length && isMarkdownTableLine(lines[i].trim())) {
        tableLines.push(lines[i]);
        i += 1;
      }
      const table = parseTableBlock(tableLines);
      if (table) blocks.push({ type: "table", rows: table });
      continue;
    }

    para.push(line);
    i += 1;
  }

  flushPara();
  return blocks;
}
