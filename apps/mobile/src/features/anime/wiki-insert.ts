export type WikiInsert = {
  id: string;
  label: string;
  icon: "text-outline" | "remove-outline" | "eye-off-outline" | "layers-outline" | "chatbox-ellipses-outline" | "return-up-back-outline" | "grid-outline";
  template: string;
};

export const WIKI_MORE_INSERTS: WikiInsert[] = [
  { id: "italic", label: "Italic", icon: "text-outline", template: "*|*" },
  { id: "strike", label: "Strikethrough", icon: "remove-outline", template: "~~|~~" },
  { id: "spoiler", label: "Spoiler", icon: "eye-off-outline", template: "\\|\\||\\|\\|" },
  { id: "fold", label: "Folding", icon: "layers-outline", template: "\n[fold:Title]\n|\n[/fold]\n" },
  { id: "quote", label: "Quote", icon: "chatbox-ellipses-outline", template: "\n> |" },
  { id: "footnote", label: "Footnote", icon: "return-up-back-outline", template: "[* |]" },
  { id: "table", label: "Table", icon: "grid-outline", template: "\n\\| | \\|\n\\| --- \\| --- \\|\n\\|  \\|  \\|\n" },
];

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
