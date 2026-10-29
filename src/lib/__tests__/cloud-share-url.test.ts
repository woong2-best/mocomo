import { describe, expect, it } from "vitest";
import {
  fileHashMismatch,
  googleDriveFileId,
  validateCloudShareUrl,
} from "@/lib/digital-cloud/cloud-share-url";
import { escrowMocoFromListingPrice } from "@/lib/moco-escrow-amount";

describe("cloud share urls", () => {
  it("accepts a Google Drive file link", () => {
    const result = validateCloudShareUrl(
      "https://drive.google.com/file/d/1AbCdefGHIjklMNOpqrst/view?usp=sharing"
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.provider).toBe("google");
      expect(result.fileId).toBe("1AbCdefGHIjklMNOpqrst");
    }
  });

  it("accepts a Dropbox share link", () => {
    const result = validateCloudShareUrl("https://www.dropbox.com/scl/fi/abc123/file.zip?dl=0");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.provider).toBe("dropbox");
  });

  it("rejects other hosts, insecure links, and lookalike domains", () => {
    expect(validateCloudShareUrl("http://drive.google.com/file/d/1AbCdefGHIjklMNOpqrst/view").ok).toBe(
      false
    );
    expect(validateCloudShareUrl("https://mega.nz/file/abc").ok).toBe(false);
    expect(validateCloudShareUrl("https://drive.google.com.evil.com/file/d/1AbCdefGHIjklMNOpqrst/view").ok).toBe(
      false
    );
    expect(validateCloudShareUrl("https://drive.google.com/drive/home").ok).toBe(false);
  });

  it("reads a Drive file id from the open query", () => {
    const url = new URL("https://drive.google.com/open?id=1AbCdefGHIjklMNOpqrst");
    expect(googleDriveFileId(url)).toBe("1AbCdefGHIjklMNOpqrst");
  });

  it("flags hash mismatches of the same algorithm only", () => {
    const sha = "a".repeat(64);
    expect(fileHashMismatch(sha, "b".repeat(64))).toBe(true);
    expect(fileHashMismatch(sha, sha)).toBe(false);
    expect(fileHashMismatch(sha, null)).toBe(false);
    expect(fileHashMismatch("c".repeat(32), "d".repeat(32))).toBe(true);
  });
});

describe("escrow MOCO amounts", () => {
  it("converts listing prices into whole MOCO", () => {
    expect(escrowMocoFromListingPrice(10_000, "krw")).toBe(1_000);
    expect(escrowMocoFromListingPrice(1_000, "usd")).toBe(2);
    expect(escrowMocoFromListingPrice(12, "moco")).toBe(12);
    expect(escrowMocoFromListingPrice(9, "krw")).toBeNull();
    expect(escrowMocoFromListingPrice(500, "eur")).toBeNull();
  });
});
