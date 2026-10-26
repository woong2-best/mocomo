export type WikiMacro = {
  id: string;
  label: string;
  template: string;
  wrapSelection?: boolean;
  existingHeader?: string;
};

export const WIKI_MACROS: WikiMacro[] = [
  { id: "title", label: "Title", template: "[|]", wrapSelection: true },
  { id: "category", label: "Category", template: "{|}", wrapSelection: true },
  { id: "genre", label: "Genre", template: "[Genre: |]" },
  { id: "studio", label: "Studio", template: "[Studio: |]" },
  { id: "tags", label: "Tags", template: "[Tags: |]" },
  { id: "characters", label: "Characters (one per line)", template: "[Characters:\n|\n]" },
  {
    id: "synopsis",
    label: "Synopsis / description",
    template: "\n== Synopsis ==\n|\n",
    existingHeader: "== Synopsis ==",
  },
  {
    id: "setting",
    label: "Setting",
    template: "\n== Setting ==\n|\n",
    existingHeader: "== Setting ==",
  },
];

export const WIKI_BODY_MACROS: WikiMacro[] = [
  {
    id: "heading",
    label: "Heading",
    template: "\n== | ==\n\n",
  },
  {
    id: "infobox",
    label: "Infobox",
    template:
      "\n=== Work info ===\nGenre \\| |\nStudio \\| \nNetwork \\| \nEpisodes \\| \n\n",
    existingHeader: "=== Work info ===",
  },
  {
    id: "wikilink",
    label: "Wiki link",
    template: "[[|]]",
    wrapSelection: true,
  },
];

export const WIKI_FORMAT_MACROS: WikiMacro[] = [
  { id: "bold", label: "Bold", template: "**|**", wrapSelection: true },
  { id: "italic", label: "Italic", template: "*|*", wrapSelection: true },
  { id: "strike", label: "Strike", template: "~~|~~", wrapSelection: true },
  { id: "spoiler", label: "Spoiler", template: "\\|\\||\\|\\|", wrapSelection: true },
  { id: "sup", label: "Superscript", template: "^^|^^", wrapSelection: true },
  { id: "sub", label: "Subscript", template: ",,|,,", wrapSelection: true },
  { id: "quote", label: "Quote", template: "\n> |", wrapSelection: true },
  { id: "footnote", label: "Footnote", template: "[* |]", wrapSelection: true },
  {
    id: "fold",
    label: "Folding",
    template: "\n[fold:Title]\n|\n[/fold]\n",
    wrapSelection: true,
  },
  {
    id: "table",
    label: "Table",
    template: "\n| | | |\n| --- | --- |\n|  |  |\n",
    wrapSelection: true,
  },
];

export function colorMacro(color: string): WikiMacro {
  return { id: `color-${color}`, label: "Color", template: `{#${color} |}`, wrapSelection: true };
}

export function highlightMacro(color: string): WikiMacro {
  return { id: `bg-${color}`, label: "Highlight", template: `[bg:${color} |]`, wrapSelection: true };
}

export function sizeMacro(step: number): WikiMacro {
  const sign = step > 0 ? `+${step}` : `${step}`;
  return { id: `size-${sign}`, label: "Size", template: `{${sign} |}`, wrapSelection: true };
}

export function getWikiMacro(id: string): WikiMacro | undefined {
  return (
    WIKI_MACROS.find((macro) => macro.id === id) ??
    WIKI_BODY_MACROS.find((macro) => macro.id === id) ??
    WIKI_FORMAT_MACROS.find((macro) => macro.id === id)
  );
}
