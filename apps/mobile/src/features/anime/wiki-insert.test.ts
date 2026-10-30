import { describe, expect, it } from "vitest";
import { colorTemplate, insertWikiTemplate, sizeTemplate } from "./wiki-insert";

describe("insertWikiTemplate", () => {
  it("wraps the selection with bold markers", () => {
    expect(insertWikiTemplate("hello", 0, 5, "**|**")).toEqual({
      next: "**hello**",
      caret: 7,
    });
  });

  it("inserts a heading caret in the middle of the marks", () => {
    const result = insertWikiTemplate("", 0, 0, "\n== | ==\n");
    expect(result.next).toBe("\n==  ==\n");
    expect(result.caret).toBe(4);
  });

  it("keeps escaped pipes in spoiler markup", () => {
    expect(insertWikiTemplate("secret", 0, 6, "\\|\\||\\|\\|")).toEqual({
      next: "||secret||",
      caret: 8,
    });
  });
});

describe("wiki format templates", () => {
  it("builds color and size wrappers", () => {
    expect(colorTemplate("red")).toBe("{#red}|{/}");
    expect(sizeTemplate(2)).toBe("{+2 |}");
    expect(sizeTemplate(-1)).toBe("{-1 |}");
  });
});
