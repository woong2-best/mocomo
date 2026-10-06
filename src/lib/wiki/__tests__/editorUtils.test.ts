import { describe, expect, it } from "vitest";
import { WIKI_MACROS, getWikiMacro } from "@/lib/wiki/macros";
import { DUMMY_WIKI_TITLES } from "@/lib/wiki/dummyTitles";
import {
  applyTitleSuggestion,
  detectTitleContext,
  indexWikiTitles,
  insertMacro,
  insertOrFocusToken,
  normalize,
  replaceRange,
  searchTitles,
} from "@/lib/wiki/editorUtils";

const indexed = indexWikiTitles(DUMMY_WIKI_TITLES);

describe("normalize", () => {
  it("keeps colons and strips spaces only", () => {
    expect(normalize("Chiikawa: Something Small and Cute")).toBe(
      "chiikawa:somethingsmallandcute"
    );
  });

  it("does not match a query that dropped the colon", () => {
    const query = normalize("Chiikawa Something");
    const title = normalize("Chiikawa: Something Small and Cute");
    expect(title.includes(query)).toBe(false);
  });
});

describe("detectTitleContext", () => {
  it("triggers inside an unclosed English title paren", () => {
    const value = "[ちいかわ (chii";
    const ctx = detectTitleContext(value, value.length);
    expect(ctx).toEqual({
      query: "chii",
      replaceStart: value.lastIndexOf("(") + 1,
      replaceEnd: value.length,
    });
  });

  it("extends replaceEnd to just before a closing paren", () => {
    const value = "[ちいかわ (chii kawa)]";
    const caret = value.indexOf("chii") + 4;
    const ctx = detectTitleContext(value, caret);
    expect(ctx?.query).toBe("chii kawa");
    expect(value.slice(ctx!.replaceStart, ctx!.replaceEnd)).toBe("chii kawa");
  });

  it("returns null on Genre / Studio / Tags / Characters lines", () => {
    for (const line of ["[Genre: (chii", "[Studio: (chii", "[Tags: (chii", "[Characters: (chii"]) {
      expect(detectTitleContext(line, line.length)).toBeNull();
    }
  });

  it("returns null when the query is only whitespace", () => {
    const value = "[ちいかわ (   ";
    expect(detectTitleContext(value, value.length)).toBeNull();
  });

  it("returns null outside a title paren", () => {
    expect(detectTitleContext("plain chii", 10)).toBeNull();
    expect(detectTitleContext("[Genre: Slice of Life]", 10)).toBeNull();
  });
});

describe("searchTitles", () => {
  it("ranks prefix matches above mid-string matches", () => {
    const rows = searchTitles(indexed, "chii");
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].normalizedEnglish.startsWith("chii")).toBe(true);
    expect(rows[0].english.startsWith("Chiikawa")).toBe(true);
  });

  it("puts an exact English title first", () => {
    const rows = searchTitles(indexed, "Chiikawa: Something Small and Cute");
    expect(rows[0]?.english).toBe("Chiikawa: Something Small and Cute");
    expect(rows[0]?.normalizedEnglish).toBe(normalize("Chiikawa: Something Small and Cute"));
  });

  it("does not match when the colon is omitted", () => {
    expect(searchTitles(indexed, "Chiikawa Something")).toEqual([]);
  });
});

describe("insertMacro", () => {
  const byId = (id: string) => {
    const macro = getWikiMacro(id);
    if (!macro) throw new Error(id);
    return macro;
  };

  it("preserves surrounding text and places the caret at |", () => {
    const value = "hello\nworld";
    const result = insertMacro(value, 5, 5, byId("title"));
    expect(result.next).toBe("hello[]\nworld");
    expect(result.caret).toBe(6);
  });

  it("wraps a selection for Title and Category", () => {
    const title = insertMacro("keep Chiikawa end", 5, 13, byId("title"));
    expect(title.next).toBe("keep [Chiikawa] end");
    expect(title.caret).toBe(15);

    const category = insertMacro("keep Anime end", 5, 10, byId("category"));
    expect(category.next).toBe("keep {Anime} end");
    expect(category.caret).toBe(12);
  });

  it("inserts Genre / Studio / Tags with the caret after the colon", () => {
    const genre = insertMacro("aa", 2, 2, byId("genre"));
    expect(genre.next).toBe("aa[Genre: ]");
    expect(genre.caret).toBe(10);
  });

  it("does not add a leading newline for block headers at line start", () => {
    const result = insertMacro("left\n", 5, 5, byId("synopsis"));
    expect(result.next).toBe("left\n== Synopsis ==\n\n");
    expect(result.caret).toBe("left\n== Synopsis ==\n".length);
  });

  it("adds a leading newline when the caret is mid-line", () => {
    const result = insertMacro("left", 4, 4, byId("setting"));
    expect(result.next).toBe("left\n== Setting ==\n\n");
    expect(result.caret).toBe("left\n== Setting ==\n".length);
  });

  it("moves the caret below an existing header instead of duplicating it", () => {
    const value = "== Synopsis ==\nalready here\n";
    const result = insertMacro(value, value.length, value.length, byId("synopsis"));
    expect(result.next).toBe(value);
    expect(result.caret).toBe("== Synopsis ==\n".length);
  });
});

describe("replace helpers", () => {
  it("replaceRange keeps text outside the selection", () => {
    const result = replaceRange("abcXYZ", 3, 6, "!");
    expect(result).toEqual({ next: "abc!", caret: 4 });
  });

  it("insertOrFocusToken jumps to an existing placeholder", () => {
    const value = "aa [Cover Image] bb";
    const result = insertOrFocusToken(value, 0, 0, "[Cover Image]");
    expect(result.next).toBe(value);
    expect(result.caret).toBe(3);
  });

  it("applyTitleSuggestion replaces only the English span", () => {
    const value = "[ちいかわ (chii";
    const ctx = detectTitleContext(value, value.length);
    expect(ctx).not.toBeNull();
    const result = applyTitleSuggestion(value, ctx!, "Chiikawa: Something Small and Cute");
    expect(result.next).toBe("[ちいかわ (Chiikawa: Something Small and Cute");
    expect(result.caret).toBe(result.next.length);
  });
});

describe("macros table", () => {
  it("defines the eight toolbar macros", () => {
    expect(WIKI_MACROS.map((m) => m.id)).toEqual([
      "title",
      "category",
      "genre",
      "studio",
      "tags",
      "characters",
      "synopsis",
      "setting",
    ]);
  });
});
