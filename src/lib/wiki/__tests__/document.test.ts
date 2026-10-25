import { describe, expect, it } from "vitest";
import {
  DEFAULT_WIKI_DOCUMENT,
  composeWikiDocument,
  extractInfoboxSource,
  extractWikiHeadings,
  extractWikiLinkTargets,
  matchWikiHeading,
  splitWikiDocument,
} from "@/lib/wiki/document";

describe("matchWikiHeading", () => {
  it("reads namu-style section headings", () => {
    expect(matchWikiHeading("== Overview ==")).toEqual({ level: 2, label: "Overview" });
    expect(matchWikiHeading("=== Staff ===")).toEqual({ level: 3, label: "Staff" });
  });

  it("still reads markdown headings", () => {
    expect(matchWikiHeading("## Plot")).toEqual({ level: 2, label: "Plot" });
    expect(matchWikiHeading("# Lead")).toEqual({ level: 3, label: "Lead" });
  });
});

describe("extractInfoboxSource", () => {
  it("pulls a work-info table out of a freeform document", () => {
    const source = `=== Work info ===
Genre | Action
Studio | MAPPA

== Overview ==
A story about [[Akane Kuroka]].
`;
    const { infobox, body } = extractInfoboxSource(source);
    expect(infobox).toContain("Studio | MAPPA");
    expect(body).toContain("== Overview ==");
    expect(body).not.toContain("Studio | MAPPA");
  });
});

describe("splitWikiDocument", () => {
  it("keeps extra sections in the body and extracts characters", () => {
    const split = splitWikiDocument(`=== Work info ===
Genre | Action
Studio | MAPPA

== Overview ==
Lead.

== Characters ==
* [[Tanjiro Kamado]]
* Nezuko Kamado

== Theme songs ==
Opening.
`);
    expect(split.studio).toBe("MAPPA");
    expect(split.infobox).toContain("Genre | Action");
    expect(split.body).toContain("== Theme songs ==");
    expect(split.charactersText).toBe("Tanjiro Kamado\nNezuko Kamado");
  });
});

describe("composeWikiDocument", () => {
  it("returns the default outline when every field is empty", () => {
    expect(composeWikiDocument({})).toBe(DEFAULT_WIKI_DOCUMENT);
  });

  it("merges legacy split fields without duplicating an existing infobox", () => {
    const next = composeWikiDocument({
      synopsis: "== Overview ==\nHello.",
      worldInfo: "A distant city.",
      infobox: "=== Work info ===\nStudio | WIT",
      charactersText: "Mumei",
    });
    expect(next).toContain("=== Work info ===");
    expect(next).toContain("== Setting ==");
    expect(next).toContain("A distant city.");
    expect(next).toContain("== Characters ==");
    expect(next).toContain("Mumei");
  });
});

describe("wiki link + heading extractors", () => {
  it("collects unique [[targets]]", () => {
    expect(extractWikiLinkTargets("See [[A]] and [[Label|A]] and [[B]].")).toEqual(["A", "B"]);
  });

  it("skips infobox headings in the table of contents", () => {
    const headings = extractWikiHeadings(`=== Work info ===
Genre | Action

== Overview ==
Text
=== Staff ===
People
`);
    expect(headings.map((h) => h.label)).toEqual(["Overview", "Staff"]);
  });
});
