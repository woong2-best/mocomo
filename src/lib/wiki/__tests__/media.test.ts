import { describe, expect, it } from "vitest";
import {
  appendWikiEditorMedia,
  composeWikiEditorMedia,
  extractWikiEditorMedia,
  extractWikiVideos,
  parseWikiVideoLine,
  parseWikiVideoUrl,
  removeWikiEditorMedia,
  stripWikiEditorMedia,
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

describe("wiki editor media dock", () => {
  const image = "![image](https://cdn.mocomo.net/shot.jpg)";
  const youtube = "https://www.youtube.com/watch?v=s2muG5yqdSc";

  it("extracts images and standalone videos, then hides them from the textarea", () => {
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
    expect(stripWikiEditorMedia(source)).toBe("Intro\n\nOutro");
  });

  it("leaves an in-sentence YouTube URL in the textarea", () => {
    const source = "Watch https://www.youtube.com/watch?v=s2muG5yqdSc later.";
    expect(extractWikiEditorMedia(source)).toEqual([]);
    expect(stripWikiEditorMedia(source)).toBe(source);
  });

  it("appends, composes, and removes snippets without leaving markdown in the display", () => {
    const next = appendWikiEditorMedia("Hello", image);
    expect(next).toBe(`Hello\n${image}\n`);
    expect(composeWikiEditorMedia("Hello", extractWikiEditorMedia(next))).toBe(`Hello\n${image}\n`);
    expect(removeWikiEditorMedia(next, image)).toBe("Hello");
  });
});
