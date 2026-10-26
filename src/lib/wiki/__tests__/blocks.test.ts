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

  it("reads fold, quote, and tweet blocks", () => {
    const blocks = parseWikiBlocks(`[fold:Hidden]
secret
[/fold]

> cited line

https://x.com/mocomo/status/1234567890
`);
    expect(blocks.map((block) => block.type)).toEqual(["fold", "quote", "tweet"]);
    expect(blocks[0]).toMatchObject({ type: "fold", title: "Hidden", body: "secret" });
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
