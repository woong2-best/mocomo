import * as ImageManipulator from "expo-image-manipulator";

/** Browser-loadable remote URL — never persist file:// / content:// / ph:// */
export function isRemoteMediaUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;
  const raw = uri.trim();
  if (!raw) return false;
  if (raw.startsWith("/") && !raw.startsWith("//")) return true;
  return /^https?:\/\//i.test(raw);
}

export async function prepareProfileAvatar(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 320 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function prepareProfileBannerImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1200 } }],
    { compress: 0.78, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
