import { Image } from "react-native";
import * as ImageManipulator from "expo-image-manipulator";
import type { LocalMediaDraft } from "@/features/compose/compose-types";
import { translate } from "@/i18n/runtime";

const MAX_SIDE = 1920;

function loadImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err ?? new Error(translate("m.lib.could_not_read_the_image_size")))
    );
  });
}

/** Same as web prepareGalleryImageForUpload — long edge 1920px JPEG. */
export async function prepareImageForUpload(item: LocalMediaDraft): Promise<LocalMediaDraft> {
  if (item.type !== "IMAGE") return item;

  let width = item.width ?? 0;
  let height = item.height ?? 0;
  if (!width || !height) {
    const size = await loadImageSize(item.uri);
    width = size.width;
    height = size.height;
  }

  const longest = Math.max(width, height);
  if (longest <= MAX_SIDE) {
    return { ...item, width, height };
  }

  const scale = MAX_SIDE / longest;
  const nextWidth = Math.round(width * scale);
  const nextHeight = Math.round(height * scale);

  const result = await ImageManipulator.manipulateAsync(
    item.uri,
    [{ resize: { width: nextWidth, height: nextHeight } }],
    { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    ...item,
    uri: result.uri,
    width: result.width,
    height: result.height,
    mime: "image/jpeg",
    filename: item.filename.replace(/\.\w+$/, ".jpg"),
  };
}
