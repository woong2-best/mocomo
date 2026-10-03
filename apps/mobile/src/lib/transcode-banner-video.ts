import * as FileSystem from "expo-file-system/legacy";
import { translate } from "@/i18n/runtime";
async function loadFfmpeg() {
  try {
    return await import("ffmpeg-kit-react-native");
  } catch {
    throw new Error(translate("m.lib.video_conversion_is_not_available_on"));
  }
}

function stripFileUri(uri: string): string {
  return uri.startsWith("file://") ? uri.slice(7) : uri;
}

/** Banner upload — convert incompatible codecs such as H.265 to MP4 (H.264). */
export async function transcodeBannerVideoToH264(inputUri: string): Promise<{
  uri: string;
  mime: string;
  filename: string;
}> {
  const inputPath = stripFileUri(inputUri);
  const outputPath = `${FileSystem.cacheDirectory}banner-h264-${Date.now()}.mp4`;
  const outputUri = outputPath.startsWith("file://") ? outputPath : `file://${outputPath}`;

  const args = [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-map",
    "0:a?",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ];

  const { FFmpegKit, ReturnCode } = await loadFfmpeg();
  const session = await FFmpegKit.executeWithArguments(args);
  const code = await session.getReturnCode();
  if (!ReturnCode.isSuccess(code)) {
    const logs = await session.getAllLogsAsString();
    throw new Error(logs?.slice(-400) || translate("m.lib.banner_video_conversion_failed"));
  }

  return {
    uri: outputUri,
    mime: "video/mp4",
    filename: `profile-banner-${Date.now()}.mp4`,
  };
}
