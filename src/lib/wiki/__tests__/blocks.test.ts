import { describe, expect, it } from "vitest";
import { parseWikiBlocks } from "@/lib/wiki/blocks";

describe("parseWikiBlocks", () => {
  it("reads namu headings on their own line without a blank line", () => {
    const blocks = parseWikiBlocks("== Overview ==\nHello [[Akane]].");
    expect(blocks).toEqual([
      { type: "heading", level: 2, label: "Overview" },
      { type: "paragraph", text: "Hello [[Akane]]." },
    ]);
  });

  it("skips an infobox so it can live in the sidebar", () => {
    const blocks = parseWikiBlocks(`=== Work info ===
Genre | Action
Studio | MAPPA

== Synopsis ==
Text
`);
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph"]);
    expect(blocks[0]).toMatchObject({ type: "heading", label: "Synopsis" });
  });

  it("turns a pasted YouTube URL under a heading into a video block", () => {
    const blocks = parseWikiBlocks(`== Theme songs ==
https://www.youtube.com/watch?v=s2muG5yqdSc
`);
    expect(blocks).toEqual([
      { type: "heading", level: 2, label: "Theme songs" },
      {
        type: "youtube",
        id: "s2muG5yqdSc",
        source: "https://www.youtube.com/watch?v=s2muG5yqdSc",
      },
    ]);
  });
});
