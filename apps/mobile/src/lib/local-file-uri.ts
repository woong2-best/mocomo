import * as FileSystem from "expo-file-system/legacy";
import { translate } from "@/i18n/runtime";

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || "media";
  return base.replace(/[^\w.-]/g, "_").slice(0, 80) || "media";
}

/** Gallery/camera URIs (`content://`, `ph://`) cannot be PUT uploaded on Android. */
export function isReadableFileUri(uri: string): boolean {
  return uri.startsWith("file://");
}

export async function ensureLocalFileUri(uri: string, filename = "media"): Promise<string> {
  if (!uri) {
    throw new Error(translate("m.lib.could_not_read_video_info"));
  }
  if (isReadableFileUri(uri)) return uri;

  const dest = `${FileSystem.cacheDirectory}mocomo-local-${Date.now()}-${safeFilename(filename)}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}
