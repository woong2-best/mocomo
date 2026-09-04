import test from "node:test";
import assert from "node:assert/strict";
import { dedupeClipboardFiles, filesFromClipboard } from "../clipboard-files";

function fakeFile(name: string, bytes = 12, type = "image/png"): File {
  return new File([new Uint8Array(bytes)], name, { type, lastModified: 1_700_000_000_000 });
}

function fakeTransfer(opts: {
  files?: File[];
  items?: Array<{ kind: string; getAsFile: () => File | null }>;
}): DataTransfer {
  return {
    files: (opts.files ?? []) as unknown as FileList,
    items: (opts.items ?? []) as unknown as DataTransferItemList,
  } as DataTransfer;
}

test("filesFromClipboard prefers data.files and ignores duplicate items", () => {
  const file = fakeFile("alzip.png");
  const clone = fakeFile("alzip.png");
  const data = fakeTransfer({
    files: [file],
    items: [
      { kind: "file", getAsFile: () => clone },
      { kind: "string", getAsFile: () => null },
    ],
  });
  const out = filesFromClipboard(data);
  assert.equal(out.length, 1);
  assert.equal(out[0], file);
});

test("filesFromClipboard falls back to items when files is empty", () => {
  const file = fakeFile("shot.jpg", 24, "image/jpeg");
  const data = fakeTransfer({
    files: [],
    items: [{ kind: "file", getAsFile: () => file }],
  });
  const out = filesFromClipboard(data);
  assert.equal(out.length, 1);
  assert.equal(out[0], file);
});

test("dedupeClipboardFiles collapses identical name/size/type/mtime", () => {
  const a = fakeFile("same.png");
  const b = fakeFile("same.png");
  assert.equal(dedupeClipboardFiles([a, b]).length, 1);
});
