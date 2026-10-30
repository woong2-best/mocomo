export type WikiInsert = {
  id: string;
  label: string;
  icon:
    | "text-outline"
    | "remove-outline"
    | "eye-off-outline"
    | "layers-outline"
    | "chatbox-ellipses-outline"
    | "return-up-back-outline"
    | "grid-outline"
    | "list-outline"
    | "color-filter-outline";
  template: string;
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
  { step: -2, label: "XS" },
  { step: -1, label: "S" },
  { step: 1, label: "L" },
  { step: 2, label: "XL" },
  { step: 3, label: "XXL" },
] as const;

export const WIKI_MORE_INSERTS: WikiInsert[] = [
  { id: "footnote", label: "Footnote", icon: "return-up-back-outline", template: "[* |]" },
  { id: "list", label: "List", icon: "list-outline", template: "\n- |" },
  { id: "highlight", label: "Highlight", icon: "color-filter-outline", template: "[bg:gold |]" },
];

export function colorTemplate(color: string) {
  return `{#${color}}|{/}`;
}

export function highlightTemplate(color: string) {
  return `[bg:${color} |]`;
}

export function sizeTemplate(step: number) {
  const sign = step > 0 ? `+${step}` : `${step}`;
  return `{${sign} |}`;
}

export function insertWikiTemplate(
  value: string,
  start: number,
  end: number,
  template: string
): { next: string; caret: number } {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  const selected = value.slice(from, to);
  const unescaped = template.replace(/\\\|/g, "\u0000");
  const pipe = unescaped.indexOf("|");
  const raw =
    pipe >= 0 ? unescaped.slice(0, pipe) + selected + unescaped.slice(pipe + 1) : unescaped + selected;
  const inserted = raw.replace(/\u0000/g, "|");
  const caret =
    from + (pipe >= 0 ? unescaped.slice(0, pipe).replace(/\u0000/g, "|").length + selected.length : inserted.length);
  return { next: value.slice(0, from) + inserted + value.slice(to), caret };
}
