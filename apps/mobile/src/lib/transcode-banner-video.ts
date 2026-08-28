import * as FileSystem from "expo-file-system/legacy";
import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";

function stripFileUri(uri: string): string {
  return uri.startsWith("file://") ? uri.slice(7) : uri;
}

/** 배너 업로드용 — H.265 등 비호환 코덱을 MP4(H.264)로 변환 */
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

  const session = await FFmpegKit.executeWithArguments(args);
  const code = await session.getReturnCode();
  if (!ReturnCode.isSuccess(code)) {
    const logs = await session.getAllLogsAsString();
    throw new Error(logs?.slice(-400) || "배너 영상 변환에 실패했습니다.");
  }

  return {
    uri: outputUri,
    mime: "video/mp4",
    filename: `profile-banner-${Date.now()}.mp4`,
  };
}
