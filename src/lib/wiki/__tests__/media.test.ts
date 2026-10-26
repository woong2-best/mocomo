import { describe, expect, it } from "vitest";
import { extractWikiVideos, parseWikiVideoLine, parseWikiVideoUrl } from "@/lib/wiki/media";

describe("parseWikiVideoLine", () => {
  it("reads a pasted YouTube watch URL", () => {
    const video = parseWikiVideoLine("https://www.youtube.com/watch?v=s2muG5yqdSc");
    expect(video).toMatchObject({ kind: "youtube", id: "s2muG5yqdSc" });
  });

  it("reads shorts, youtu.be, and [youtube:] tags", () => {
    expect(parseWikiVideoLine("https://youtu.be/s2muG5yqdSc")?.id).toBe("s2muG5yqdSc");
    expect(parseWikiVideoLine("https://www.youtube.com/shorts/s2muG5yqdSc")?.id).toBe("s2muG5yqdSc");
    expect(parseWikiVideoLine("[youtube:s2muG5yqdSc]")?.id).toBe("s2muG5yqdSc");
  });

  it("reads a markdown YouTube link and an uploaded file tag", () => {
    expect(parseWikiVideoLine("[OP](https://www.youtube.com/watch?v=s2muG5yqdSc)")?.id).toBe(
      "s2muG5yqdSc"
    );
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

describe("parseWikiVideoUrl", () => {
  it("reads Vimeo", () => {
    expect(parseWikiVideoUrl("https://vimeo.com/123456789")).toMatchObject({
      kind: "vimeo",
      id: "123456789",
    });
  });
});
