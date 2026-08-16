import * as FileSystem from "expo-file-system/legacy";
import { FFmpegKit, FFprobeKit, ReturnCode } from "ffmpeg-kit-react-native";
import type { LocalMediaDraft, VideoEditDraft } from "@/features/compose/compose-types";
import { DEFAULT_VIDEO_EDIT } from "@/features/compose/compose-types";
import { hasActiveWatermark, type WatermarkOptions } from "@/lib/media-watermark";
import { getVideoFilter } from "@/lib/video-filters";

export type VideoProbe = {
  width: number;
  height: number;
  durationSec: number;
};

function stripFileUri(uri: string): string {
  return uri.startsWith("file://") ? uri.slice(7) : uri;
}

export async function probeVideo(uri: string): Promise<VideoProbe> {
  const path = stripFileUri(uri);
  const session = await FFprobeKit.getMediaInformation(path);
  const info = session.getMediaInformation();
  if (!info) {
    throw new Error("영상 정보를 읽을 수 없습니다.");
  }
  const durationRaw = info.getDuration();
  const durationSec = durationRaw ? parseFloat(String(durationRaw)) : 0;
  const streams = info.getStreams() ?? [];
  const video = streams.find((s) => s.getType() === "video");
  const width = video?.getWidth() ?? 1280;
  const height = video?.getHeight() ?? 720;
  return {
    width,
    height,
    durationSec: Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 60,
  };
}

function transformChain(edit: VideoEditDraft): string {
  const ops: string[] = [];
  if (edit.rotation === 90) ops.push("transpose=1");
  else if (edit.rotation === 180) ops.push("hflip", "vflip");
  else if (edit.rotation === 270) ops.push("transpose=2");
  if (edit.flipX) ops.push("hflip");
  return ops.join(",");
}

function buildColorFilter(edit: VideoEditDraft): string {
  const parts: string[] = [];
  const transform = transformChain(edit);
  if (transform) parts.push(transform);
  const filterVf = getVideoFilter(edit.filterId).vf;
  if (filterVf) parts.push(filterVf);
  return parts.join(",");
}

export async function processVideoForUpload(
  item: LocalMediaDraft,
  label: string | undefined,
  options: WatermarkOptions,
  overlayPngUri?: string | null,
  textOverlayPngUri?: string | null
): Promise<LocalMediaDraft> {
  if (item.type !== "VIDEO") return item;

  const edit = item.videoEdit ?? DEFAULT_VIDEO_EDIT;
  const probe = await probeVideo(item.uri);
  const startSec = Math.max(0, edit.startSec);
  const endSec =
    edit.endSec > startSec ? Math.min(edit.endSec, probe.durationSec) : probe.durationSec;

  const burnWatermark = !!label && hasActiveWatermark(options) && !!overlayPngUri;
  const hasTextOverlay = !!textOverlayPngUri && edit.textOverlays.length > 0;
  const colorFilter = buildColorFilter(edit);
  const trimmed =
    startSec > 0.05 || endSec < probe.durationSec - 0.05;
  const hasExternalAudio = !!edit.audioTrack?.uri;

  const needsReencode =
    trimmed ||
    colorFilter.length > 0 ||
    burnWatermark ||
    hasTextOverlay ||
    hasExternalAudio;

  if (!needsReencode) {
    return {
      ...item,
      width: probe.width,
      height: probe.height,
      duration: Math.round(endSec - startSec),
    };
  }

  const outUri = `${FileSystem.cacheDirectory}mocomo-video-${Date.now()}.mp4`;
  const inputPath = stripFileUri(item.uri);
  const outputPath = stripFileUri(outUri);

  const args: string[] = ["-y", "-ss", String(startSec), "-to", String(endSec), "-i", inputPath];

  let nextInput = 1;
  const watermarkIdx = burnWatermark ? nextInput++ : null;
  const textIdx = hasTextOverlay ? nextInput++ : null;
  const audioIdx = hasExternalAudio ? nextInput++ : null;

  if (watermarkIdx != null && overlayPngUri) {
    args.push("-i", stripFileUri(overlayPngUri));
  }
  if (textIdx != null && textOverlayPngUri) {
    args.push("-i", stripFileUri(textOverlayPngUri));
  }
  if (audioIdx != null && edit.audioTrack?.uri) {
    args.push("-i", stripFileUri(edit.audioTrack.uri));
  }

  const videoFilters: string[] = [];
  let videoLabel = "0:v";

  if (colorFilter) {
    videoFilters.push(`[${videoLabel}]${colorFilter}[vproc]`);
    videoLabel = "vproc";
  }

  if (watermarkIdx != null) {
    videoFilters.push(`[${videoLabel}][${watermarkIdx}:v]overlay=0:0:format=auto[vwm]`);
    videoLabel = "vwm";
  }
  if (textIdx != null) {
    videoFilters.push(`[${videoLabel}][${textIdx}:v]overlay=0:0:format=auto[outv]`);
    videoLabel = "outv";
  } else if (videoFilters.length > 0) {
    videoFilters.push(`[${videoLabel}]copy[outv]`);
  }

  const audioFilters: string[] = [];
  if (audioIdx != null) {
    const vol = Math.max(0, Math.min(1, edit.audioTrack?.volume ?? 1));
    audioFilters.push(`[${audioIdx}:a]volume=${vol.toFixed(2)}[exta]`);
    audioFilters.push(`[0:a?][exta]amix=inputs=2:duration=first:dropout_transition=2[aout]`);
  }

  const filterParts = [...videoFilters, ...audioFilters];
  if (filterParts.length > 0) {
    args.push("-filter_complex", filterParts.join(";"));
    if (videoFilters.length > 0) {
      args.push("-map", "[outv]");
    } else {
      args.push("-map", "0:v");
    }
    if (audioFilters.length > 0) {
      args.push("-map", "[aout]");
    } else {
      args.push("-map", "0:a?");
    }
  } else {
    args.push("-map", "0:v", "-map", "0:a?");
  }

  args.push(
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-shortest",
    "-movflags",
    "+faststart",
    outputPath
  );

  const session = await FFmpegKit.executeWithArguments(args);
  const code = await session.getReturnCode();
  if (!ReturnCode.isSuccess(code)) {
    const logs = await session.getAllLogsAsString();
    throw new Error(logs?.slice(-400) || "영상 처리에 실패했습니다.");
  }

  const nextProbe = await probeVideo(outUri);
  return {
    ...item,
    uri: outUri,
    mime: "video/mp4",
    filename: item.filename.replace(/\.\w+$/, ".mp4"),
    width: nextProbe.width,
    height: nextProbe.height,
    duration: Math.round(endSec - startSec),
  };
}
