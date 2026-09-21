import * as ImageManipulator from "expo-image-manipulator";

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
