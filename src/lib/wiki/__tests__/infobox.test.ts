import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIKI_INFOBOX,
  infoboxSectionsFromSource,
  mergeStudioIntoInfobox,
  parseWikiInfobox,
  serializeWikiInfobox,
} from "@/lib/anime-wiki-infobox";

describe("serializeWikiInfobox", () => {
  it("round-trips work-info rows the Article info card can read", () => {
    const source = serializeWikiInfobox([
      {
        title: "Work info",
        rows: [
          { label: "Studio", value: "MAPPA" },
          { label: "Network", value: "Fuji TV" },
        ],
      },
    ]);
    expect(source).toContain("Studio | MAPPA");
    expect(parseWikiInfobox(source)[0]?.rows).toEqual([
      { label: "Studio", value: "MAPPA" },
      { label: "Network", value: "Fuji TV" },
    ]);
  });

  it("drops rows without a label so empty add-field drafts stay out of the card", () => {
    expect(
      serializeWikiInfobox([
        { title: "Work info", rows: [{ label: "", value: "MAPPA" }, { label: "Studio", value: "Wit" }] },
      ])
    ).toBe("=== Work info ===\nStudio | Wit");
  });
});

describe("mergeStudioIntoInfobox", () => {
  it("fills an empty Studio row from the saved studio field", () => {
    const next = mergeStudioIntoInfobox(DEFAULT_WIKI_INFOBOX, "WIT STUDIO");
    expect(parseWikiInfobox(next).flatMap((section) => section.rows)).toContainEqual({
      label: "Studio",
      value: "WIT STUDIO",
    });
  });

  it("does not overwrite a studio the editor already set", () => {
    const next = mergeStudioIntoInfobox("=== Work info ===\nStudio | MAPPA\n", "WIT");
    expect(next).toContain("Studio | MAPPA");
    expect(next).not.toContain("WIT");
  });
});

describe("infoboxSectionsFromSource", () => {
  it("starts a blank editor with Studio / Network / Episodes", () => {
    const labels = infoboxSectionsFromSource("").flatMap((section) => section.rows.map((row) => row.label));
    expect(labels).toEqual(["Studio", "Network", "Episodes"]);
  });
});
