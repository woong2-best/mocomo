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

export function getWikiMacro(id: string): WikiMacro | undefined {
  return WIKI_MACROS.find((macro) => macro.id === id) ?? WIKI_BODY_MACROS.find((macro) => macro.id === id);
}
