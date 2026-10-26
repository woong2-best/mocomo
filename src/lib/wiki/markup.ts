export const WIKI_NAMED_COLORS: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  orange: "#f97316",
  purple: "#a855f7",
  pink: "#ec4899",
  gray: "#6b7280",
  grey: "#6b7280",
  black: "#111827",
  white: "#f8fafc",
  aqua: "#06b6d4",
  brown: "#92400e",
  gold: "#d4a63a",
};

export const WIKI_COLOR_SWATCHES = [
  { id: "red", value: "#ef4444" },
  { id: "orange", value: "#f97316" },
  { id: "gold", value: "#d4a63a" },
  { id: "green", value: "#22c55e" },
  { id: "aqua", value: "#06b6d4" },
  { id: "blue", value: "#3b82f6" },
  { id: "purple", value: "#a855f7" },
  { id: "pink", value: "#ec4899" },
  { id: "black", value: "#111827" },
  { id: "gray", value: "#6b7280" },
] as const;

export const WIKI_SIZE_STEPS = [
  { step: -2, label: "XS", className: "text-[11px]" },
  { step: -1, label: "S", className: "text-xs" },
  { step: 1, label: "L", className: "text-base" },
  { step: 2, label: "XL", className: "text-lg" },
  { step: 3, label: "XXL", className: "text-xl" },
] as const;

export function resolveWikiColor(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value)) return value;
  return WIKI_NAMED_COLORS[value.toLowerCase()] ?? null;
}

export function wikiSizeClass(step: number): string {
  if (step <= -2) return "text-[11px]";
  if (step === -1) return "text-xs";
  if (step === 1) return "text-base";
  if (step === 2) return "text-lg";
  if (step >= 3) return "text-xl font-semibold";
  return "";
}

export type WikiInlineNode =
  | { type: "text"; value: string }
  | { type: "bold" | "italic" | "strike" | "spoiler" | "sup" | "sub"; children: WikiInlineNode[] }
  | { type: "color"; color: string; children: WikiInlineNode[] }
  | { type: "size"; step: number; children: WikiInlineNode[] }
  | { type: "highlight"; color: string; children: WikiInlineNode[] }
  | { type: "wikilink"; label: string; target: string }
  | { type: "link"; href: string; label: string }
  | { type: "image"; src: string; alt: string }
  | { type: "footnote"; id: string }
  | { type: "badge"; value: string };

const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"{}|\\^`[\]]+/gi;

function takeUntil(source: string, start: number, closer: string): { inner: string; next: number } | null {
  const end = source.indexOf(closer, start);
  if (end < 0) return null;
  return { inner: source.slice(start, end), next: end + closer.length };
}

function parseDelimited(
  source: string,
  i: number,
  open: string,
  close: string,
  type: "bold" | "italic" | "strike" | "spoiler" | "sup" | "sub"
): { node: WikiInlineNode; next: number } | null {
  if (!source.startsWith(open, i)) return null;
  const taken = takeUntil(source, i + open.length, close);
  if (!taken || taken.inner.includes("\n")) return null;
  return { node: { type, children: parseWikiInline(taken.inner) }, next: taken.next };
}

export function parseWikiInline(source: string): WikiInlineNode[] {
  const nodes: WikiInlineNode[] = [];
  let i = 0;
  let textStart = 0;

  const flushText = (end: number) => {
    if (end <= textStart) return;
    splitTextWithUrls(source.slice(textStart, end)).forEach((node) => nodes.push(node));
  };

  while (i < source.length) {
    const matched = matchInline(source, i);
    if (!matched) {
      i += 1;
      continue;
    }
    flushText(i);
    nodes.push(matched.node);
    i = matched.next;
    textStart = i;
  }

  flushText(source.length);
  return nodes.length ? nodes : [{ type: "text", value: source }];
}

function splitTextWithUrls(value: string): WikiInlineNode[] {
  if (!value) return [];
  const nodes: WikiInlineNode[] = [];
  let last = 0;
  for (const match of value.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    let core = match[0];
    let trailing = "";
    while (core.length > 0 && /[.,;:!?)\]}>'"]$/.test(core)) {
      trailing = core.slice(-1) + trailing;
      core = core.slice(0, -1);
    }
    if (start > last) nodes.push({ type: "text", value: value.slice(last, start) });
    const href = core.startsWith("www.") ? `https://${core}` : core;
    nodes.push({ type: "link", href, label: core });
    if (trailing) nodes.push({ type: "text", value: trailing });
    last = start + match[0].length;
  }
  if (last < value.length) nodes.push({ type: "text", value: value.slice(last) });
  return nodes;
}

function matchInline(source: string, i: number): { node: WikiInlineNode; next: number } | null {
  const ch = source[i];
  const next = source[i + 1];

  if (source.startsWith("[[", i)) {
    const taken = takeUntil(source, i + 2, "]]");
    if (!taken || taken.inner.includes("\n")) return null;
    const pipe = taken.inner.indexOf("|");
    const label = pipe >= 0 ? taken.inner.slice(0, pipe) : taken.inner;
    const target = (pipe >= 0 ? taken.inner.slice(pipe + 1) : taken.inner).trim();
    if (!target) return null;
    return { node: { type: "wikilink", label: label.trim() || target, target }, next: taken.next };
  }

  if (source.startsWith("![", i)) {
    const img = source.slice(i).match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (!img) return null;
    return { node: { type: "image", alt: img[1], src: img[2] }, next: i + img[0].length };
  }

  if (source.startsWith("[^", i)) {
    const fn = source.slice(i).match(/^\[\^(\d+)\]/);
    if (!fn) return null;
    return { node: { type: "footnote", id: fn[1] }, next: i + fn[0].length };
  }

  if (source.startsWith("[bg:", i)) {
    const hl = source.slice(i).match(/^\[bg:([#A-Za-z0-9]+)\s+([^\]]+)\]/);
    if (!hl) return null;
    const color = resolveWikiColor(hl[1]) ?? hl[1];
    return {
      node: { type: "highlight", color, children: parseWikiInline(hl[2]) },
      next: i + hl[0].length,
    };
  }

  if (ch === "[" && next !== "[") {
    const md = source.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (md) {
      return { node: { type: "link", label: md[1], href: md[2].trim() }, next: i + md[0].length };
    }
  }

  if (source.startsWith("{{", i)) {
    const taken = takeUntil(source, i + 2, "}}");
    if (!taken || taken.inner.includes("\n")) return null;
    return { node: { type: "badge", value: taken.inner.trim() }, next: taken.next };
  }

  if (source.startsWith("{#", i)) {
    const color = source.slice(i).match(/^\{#([0-9a-fA-F]{3,8}|[A-Za-z]+)\s+([^}]+)\}/);
    if (!color) return null;
    const token = color[1];
    const resolved = resolveWikiColor(/^[0-9a-fA-F]{3,8}$/i.test(token) ? `#${token}` : token);
    return {
      node: { type: "color", color: resolved ?? token, children: parseWikiInline(color[2]) },
      next: i + color[0].length,
    };
  }

  if ((source.startsWith("{+", i) || source.startsWith("{-", i)) && /[1-3]/.test(source[i + 2] ?? "")) {
    const size = source.slice(i).match(/^\{([+-][1-3])\s+([^}]+)\}/);
    if (!size) return null;
    return {
      node: { type: "size", step: Number(size[1]), children: parseWikiInline(size[2]) },
      next: i + size[0].length,
    };
  }

  if (source.startsWith("||", i)) {
    return parseDelimited(source, i, "||", "||", "spoiler");
  }
  if (source.startsWith("**", i)) {
    return parseDelimited(source, i, "**", "**", "bold");
  }
  if (source.startsWith("~~", i)) {
    return parseDelimited(source, i, "~~", "~~", "strike");
  }
  if (source.startsWith("^^", i)) {
    return parseDelimited(source, i, "^^", "^^", "sup");
  }
  if (source.startsWith(",,", i)) {
    return parseDelimited(source, i, ",,", ",,", "sub");
  }
  if (ch === "*" && next !== "*") {
    return parseDelimited(source, i, "*", "*", "italic");
  }

  return null;
}

export function collectStarFootnotes(
  source: string,
  notes: Map<string, string>
): string {
  let next = 1;
  const used = new Set(notes.keys());
  const takeId = () => {
    while (used.has(String(next))) next += 1;
    const id = String(next);
    used.add(id);
    next += 1;
    return id;
  };
  return source.replace(/\[\*\s+([^\]]+)\]/g, (_, text: string) => {
    const id = takeId();
    notes.set(id, text);
    return `[^${id}]`;
  });
}

export function parseTweetUrl(raw: string): { url: string; handle: string; id: string } | null {
  const match = raw
    .trim()
    .match(/^https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)\/status\/(\d+)/i);
  if (!match) return null;
  return {
    url: `https://x.com/${match[1]}/status/${match[2]}`,
    handle: match[1],
    id: match[2],
  };
}
