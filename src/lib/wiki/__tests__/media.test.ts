import { describe, expect, it } from "vitest";
import {
  extractWikiEditorMedia,
  extractWikiVideos,
  insertWikiEditorMediaInPart,
  joinWikiEditorParts,
  parseWikiVideoLine,
  parseWikiVideoUrl,
  removeWikiEditorPart,
  splitWikiEditorParts,
  wikiVideoLink,
} from "@/lib/wiki/media";

describe("parseWikiVideoLine", () => {
  it("reads a pasted YouTube watch URL", () => {
    const video = parseWikiVideoLine("https://www.youtube.com/watch?v=s2muG5yqdSc");
    expect(video).toMatchObject({ kind: "youtube", id: "s2muG5yqdSc" });
  });

  it("reads shorts, youtu.be, and [youtube:] tags", () => {
    expect(parseWikiVideoLine("https://youtu.be/s2muG5yqdSc")).toMatchObject({
      kind: "youtube",
      id: "s2muG5yqdSc",
    });
    expect(parseWikiVideoLine("https://www.youtube.com/shorts/s2muG5yqdSc")).toMatchObject({
      kind: "youtube",
      id: "s2muG5yqdSc",
    });
    expect(parseWikiVideoLine("[youtube:s2muG5yqdSc]")).toMatchObject({
      kind: "youtube",
      id: "s2muG5yqdSc",
    });
  });

  it("reads a markdown YouTube link and an uploaded file tag", () => {
    expect(parseWikiVideoLine("[OP](https://www.youtube.com/watch?v=s2muG5yqdSc)")).toMatchObject({
      kind: "youtube",
      id: "s2muG5yqdSc",
    });
    expect(parseWikiVideoLine("[Video: https://cdn.mocomo.net/theme.mp4]")).toEqual({
      kind: "file",
      url: "https://cdn.mocomo.net/theme.mp4",
    });
  });

  it("does not treat mixed text as a standalone video line", () => {
    expect(parseWikiVideoLine("OP https://www.youtube.com/watch?v=s2muG5yqdSc")).toBeNull();
  });
});

describe("extractWikiVideos", () => {
  it("finds a YouTube URL inside a sentence", () => {
    const videos = extractWikiVideos("Listen here https://www.youtube.com/watch?v=s2muG5yqdSc now.");
    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({ kind: "youtube", id: "s2muG5yqdSc" });
  });
});

describe("wikiVideoLink", () => {
  it("keeps a pasted YouTube URL clickable", () => {
    expect(wikiVideoLink("https://www.youtube.com/watch?v=s2muG5yqdSc", "https://fallback")).toEqual({
      href: "https://www.youtube.com/watch?v=s2muG5yqdSc",
      label: "https://www.youtube.com/watch?v=s2muG5yqdSc",
    });
  });
});

describe("parseWikiVideoUrl", () => {
  it("reads Vimeo", () => {
    expect(parseWikiVideoUrl("https://vimeo.com/123456789")).toMatchObject({
      kind: "vimeo",
      id: "123456789",
    });
  });
});

describe("wiki editor inline media", () => {
  const image = "![image](https://cdn.mocomo.net/shot.jpg)";
  const youtube = "https://www.youtube.com/watch?v=s2muG5yqdSc";

  it("keeps images and standalone videos in document order", () => {
    const source = `Intro\n${image}\n${youtube}\nOutro`;
    expect(extractWikiEditorMedia(source)).toEqual([
      {
        kind: "image",
        snippet: image,
        url: "https://cdn.mocomo.net/shot.jpg",
        thumb: "https://cdn.mocomo.net/shot.jpg",
        alt: "image",
      },
      {
        kind: "video",
        snippet: youtube,
        url: youtube,
        thumb: "https://i.ytimg.com/vi/s2muG5yqdSc/hqdefault.jpg",
      },
    ]);
    expect(joinWikiEditorParts(splitWikiEditorParts(source))).toBe(source);
    expect(splitWikiEditorParts(source).map((part) => part.type)).toEqual([
      "text",
      "media",
      "text",
      "media",
      "text",
    ]);
  });

  it("leaves an in-sentence YouTube URL in the textarea", () => {
    const source = "Watch https://www.youtube.com/watch?v=s2muG5yqdSc later.";
    expect(extractWikiEditorMedia(source)).toEqual([]);
    expect(splitWikiEditorParts(source)).toEqual([{ type: "text", value: source }]);
  });

  it("inserts a photo at the caret between headings", () => {
    const source = "== Overview ==\n\n== Synopsis ==\n";
    const caret = source.indexOf("\n\n") + 1;
    const next = insertWikiEditorMediaInPart(source, 0, caret, caret, image);
    expect(next).toBe(`== Overview ==\n${image}\n== Synopsis ==\n`);
    expect(removeWikiEditorPart(next, 1)).toBe("== Overview ==\n\n== Synopsis ==\n");
  });
});
