import { describe, expect, it } from "vitest";
import { applyYoutubePaste, promoteYoutubeUrlsToOwnLines } from "./wiki-youtube";

describe("promoteYoutubeUrlsToOwnLines", () => {
  it("leaves a standalone YouTube URL alone", () => {
    const url = "https://youtu.be/dQw4w9WgXcQ";
    expect(promoteYoutubeUrlsToOwnLines(url)).toBe(url);
  });

  it("splits an inline YouTube URL onto its own line", () => {
    const next = promoteYoutubeUrlsToOwnLines("Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ now");
    expect(next).toBe("Watch\nhttps://www.youtube.com/watch?v=dQw4w9WgXcQ\nnow");
  });
});

describe("applyYoutubePaste", () => {
  it("ignores single-character typing", () => {
    expect(applyYoutubePaste("abc", "abcd")).toBe("abcd");
  });

  it("promotes a pasted YouTube URL", () => {
    const prev = "Hello ";
    const url = "https://youtu.be/dQw4w9WgXcQ";
    expect(applyYoutubePaste(prev, prev + url)).toBe("Hello\nhttps://youtu.be/dQw4w9WgXcQ");
  });
});
