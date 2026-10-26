import { describe, expect, it } from "vitest";
import { collectStarFootnotes, parseTweetUrl, parseWikiInline, resolveWikiColor } from "@/lib/wiki/markup";

describe("parseWikiInline", () => {
  it("parses color, size, highlight, spoiler, and strike", () => {
    const nodes = parseWikiInline("{#red 빨간} {+1 큰} [bg:yellow 강조] ||숨김|| ~~지움~~");
    expect(nodes.map((node) => node.type)).toEqual([
      "color",
      "text",
      "size",
      "text",
      "highlight",
      "text",
      "spoiler",
      "text",
      "strike",
    ]);
    expect(nodes[0]).toMatchObject({ type: "color", color: "#ef4444" });
  });

  it("parses hex color and markdown emphasis", () => {
    const nodes = parseWikiInline("{#ff0000 빨간글씨} **굵게** *기울임* ^^위^^ ,,아래,,");
    expect(nodes.map((node) => node.type)).toEqual([
      "color",
      "text",
      "bold",
      "text",
      "italic",
      "text",
      "sup",
      "text",
      "sub",
    ]);
    expect(nodes[0]).toMatchObject({ type: "color", color: "#ff0000" });
  });

  it("keeps pasted URLs as link nodes", () => {
    const nodes = parseWikiInline("See https://www.youtube.com/watch?v=s2muG5yqdSc");
    expect(nodes.some((node) => node.type === "link")).toBe(true);
  });
});

describe("collectStarFootnotes", () => {
  it("turns [* note] into an auto numbered footnote", () => {
    const notes = new Map<string, string>();
    const body = collectStarFootnotes("Hello [* secret]", notes);
    expect(body).toBe("Hello [^1]");
    expect(notes.get("1")).toBe("secret");
  });
});

describe("resolveWikiColor", () => {
  it("accepts names and hex", () => {
    expect(resolveWikiColor("blue")).toBe("#3b82f6");
    expect(resolveWikiColor("#ff0000")).toBe("#ff0000");
  });
});

describe("parseTweetUrl", () => {
  it("reads x.com status URLs", () => {
    expect(parseTweetUrl("https://x.com/mocomo/status/1234567890")).toMatchObject({
      handle: "mocomo",
      id: "1234567890",
    });
  });
});
