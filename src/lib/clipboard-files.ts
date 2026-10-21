/** Fingerprint so clipboard File + DataTransferItem.getAsFile() don't double-count. */
export function fileClipboardKey(file: File): string {
  return `${file.name}|${file.size}|${file.type}|${file.lastModified}`;
}

export function dedupeClipboardFiles(files: File[]): File[] {
  const seen = new Set<string>();
  const out: File[] = [];
  for (const file of files) {
    const key = fileClipboardKey(file);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(file);
  }
  return out;
}

/**
 * Browsers expose the same pasted image on both `clipboardData.files`
 * and `clipboardData.items` (often as a new File instance). Reading both
 * without a content key duplicates the attachment.
 */
export function filesFromClipboard(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];

  const fromList = Array.from(data.files ?? []).filter((file): file is File => !!file);
  if (fromList.length > 0) return dedupeClipboardFiles(fromList);

  const fromItems: File[] = [];
  for (const item of Array.from(data.items ?? [])) {
    if (item.kind !== "file") continue;
    const file = item.getAsFile();
    if (file) fromItems.push(file);
  }
  return dedupeClipboardFiles(fromItems);
}

/** OS file drag (Explorer / mobile share) — not in-page text or node drags. */
export function dataTransferHasFiles(data: DataTransfer | null | undefined): boolean {
  if (!data) return false;
  try {
    const types = Array.from(data.types ?? []);
    if (types.includes("Files")) return true;
  } catch {
    /* some browsers throw while types are unresolved */
  }
  return (data.files?.length ?? 0) > 0;
}

/** Same File objects the hidden <input type="file"> path already consumes. */
export function filesFromDataTransfer(data: DataTransfer | null | undefined): File[] {
  return filesFromClipboard(data);
}
