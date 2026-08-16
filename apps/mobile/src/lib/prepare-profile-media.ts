import * as ImageManipulator from "expo-image-manipulator";

export async function prepareProfileAvatar(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 512, height: 512 } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}

export async function prepareProfileBannerImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
