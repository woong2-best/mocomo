import { useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { SvgXml } from "react-native-svg";
import {
  buildWatermarkSvg,
  hasActiveWatermark,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import type { ImageEditDraft, LocalMediaDraft, VideoTextOverlay } from "@/features/compose/compose-types";
import {
  getTextOverlayTextStyle,
  overlayPixelPosition,
  textOverlayFontSize,
} from "@/features/compose/text-overlay-utils";
import { getVideoFilter } from "@/lib/video-filters";

export type WatermarkCaptureJob = {
  item: LocalMediaDraft;
  label: string;
  options: WatermarkOptions;
  imageEdit?: ImageEditDraft;
  resolve: (next: LocalMediaDraft) => void;
  reject: (err: Error) => void;
};

function imageNeedsComposite(
  item: LocalMediaDraft,
  label: string | undefined,
  options: WatermarkOptions
): boolean {
  const edit = item.imageEdit;
  if (label && hasActiveWatermark(options)) return true;
  if (!edit) return false;
  if (edit.filterId !== "none") return true;
  if (edit.textOverlays.length > 0) return true;
  if (edit.brightness !== 0 || edit.contrast !== 0 || edit.saturation !== 0) return true;
  return false;
}

/** Transparent PNG overlay for ffmpeg video burn-in */
export type WatermarkOverlayJob = {
  width: number;
  height: number;
  label: string;
  options: WatermarkOptions;
  resolve: (uri: string) => void;
  reject: (err: Error) => void;
};

type CaptureProps = {
  job: WatermarkCaptureJob | null;
  onDone: () => void;
};

type OverlayProps = {
  job: WatermarkOverlayJob | null;
  onDone: () => void;
};

type TextOverlayProps = {
  job: TextOverlayCaptureJob | null;
  onDone: () => void;
};

export type TextOverlayCaptureJob = {
  width: number;
  height: number;
  overlays: VideoTextOverlay[];
  resolve: (uri: string) => void;
  reject: (err: Error) => void;
};

/** Off-screen capture host — InlineComposeBox에서 1장씩 워터마크 합성 */
export function WatermarkCaptureHost({ job, onDone }: CaptureProps) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled || !ref.current) {
        job.reject(new Error("워터마크 합성을 시작할 수 없습니다."));
        onDone();
        return;
      }
      try {
        const uri = await captureRef(ref, {
          format: "jpg",
          quality: 0.88,
          result: "tmpfile",
        });
        if (cancelled) return;
        job.resolve({
          ...job.item,
          uri,
          mime: "image/jpeg",
          filename: job.item.filename.replace(/\.\w+$/, ".jpg"),
        });
      } catch (e) {
        if (!cancelled) {
          job.reject(e instanceof Error ? e : new Error("워터마크 합성 실패"));
        }
      } finally {
        if (!cancelled) onDone();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [job, onDone]);

  if (!job) return null;

  const width = job.item.width ?? 1080;
  const height = job.item.height ?? 1080;
  const edit = job.imageEdit;
  const filterPreset = edit ? getVideoFilter(edit.filterId) : null;
  const svg =
    job.label && hasActiveWatermark(job.options)
      ? buildWatermarkSvg(width, height, job.label, job.options)
      : null;

  return (
    <View pointerEvents="none" style={styles.host}>
      <View ref={ref} collapsable={false} style={{ width, height }}>
        <Image source={{ uri: job.item.uri }} style={{ width, height }} resizeMode="cover" />
        {filterPreset?.preview ? (
          <View
            style={{
              ...StyleSheet.absoluteFill,
              backgroundColor: filterPreset.preview.color,
              opacity: filterPreset.preview.opacity,
            }}
          />
        ) : null}
        {edit && edit.brightness !== 0 ? (
          <View
            style={{
              ...StyleSheet.absoluteFill,
              backgroundColor: edit.brightness > 0 ? "#fff" : "#000",
              opacity: Math.abs(edit.brightness) / 200,
            }}
          />
        ) : null}
        {edit?.textOverlays.map((o) => {
          const fontSize = textOverlayFontSize(height, o.scale);
          const pos = overlayPixelPosition(o, width, height);
          return (
            <View
              key={o.id}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
                maxWidth: width * 0.92,
              }}
            >
              <Text style={getTextOverlayTextStyle(o.color, fontSize)}>{o.text}</Text>
            </View>
          );
        })}
        {svg ? (
          <SvgXml xml={svg} width={width} height={height} style={StyleSheet.absoluteFill} />
        ) : null}
      </View>
    </View>
  );
}

/** Transparent PNG — text overlays for ffmpeg */
export function TextOverlayCaptureHost({ job, onDone }: TextOverlayProps) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled || !ref.current) {
        job.reject(new Error("텍스트 오버레이를 만들 수 없습니다."));
        onDone();
        return;
      }
      try {
        const uri = await captureRef(ref, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        if (cancelled) return;
        job.resolve(uri);
      } catch (e) {
        if (!cancelled) {
          job.reject(e instanceof Error ? e : new Error("텍스트 오버레이 실패"));
        }
      } finally {
        if (!cancelled) onDone();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [job, onDone]);

  if (!job || job.overlays.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.host}>
      <View
        ref={ref}
        collapsable={false}
        style={{ width: job.width, height: job.height, backgroundColor: "transparent" }}
      >
        {job.overlays.map((o) => {
          const fontSize = textOverlayFontSize(job.height, o.scale);
          const pos = overlayPixelPosition(o, job.width, job.height);
          return (
            <View
              key={o.id}
              style={{
                position: "absolute",
                left: pos.left,
                top: pos.top,
                transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
                maxWidth: job.width * 0.92,
              }}
            >
              <Text style={getTextOverlayTextStyle(o.color, fontSize)}>{o.text}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** Transparent PNG — video ffmpeg overlay */
export function WatermarkOverlayHost({ job, onDone }: OverlayProps) {
  const ref = useRef<View>(null);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, 120));
      if (cancelled || !ref.current) {
        job.reject(new Error("워터마크 오버레이를 만들 수 없습니다."));
        onDone();
        return;
      }
      try {
        const uri = await captureRef(ref, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });
        if (cancelled) return;
        job.resolve(uri);
      } catch (e) {
        if (!cancelled) {
          job.reject(e instanceof Error ? e : new Error("워터마크 오버레이 실패"));
        }
      } finally {
        if (!cancelled) onDone();
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [job, onDone]);

  if (!job || !hasActiveWatermark(job.options)) return null;

  const svg = buildWatermarkSvg(job.width, job.height, job.label, job.options);

  return (
    <View pointerEvents="none" style={styles.host}>
      <View
        ref={ref}
        collapsable={false}
        style={{ width: job.width, height: job.height, backgroundColor: "transparent" }}
      >
        <SvgXml xml={svg} width={job.width} height={job.height} />
      </View>
    </View>
  );
}

export function queueWatermarkCapture(
  setJob: (job: WatermarkCaptureJob | null) => void,
  item: LocalMediaDraft,
  label: string,
  options: WatermarkOptions
): Promise<LocalMediaDraft> {
  if (item.type !== "IMAGE" || !imageNeedsComposite(item, label, options)) {
    return Promise.resolve(item);
  }
  return new Promise((resolve, reject) => {
    setJob({
      item,
      label,
      options,
      imageEdit: item.imageEdit,
      resolve,
      reject,
    });
  });
}

export function queueTextOverlay(
  setJob: (job: TextOverlayCaptureJob | null) => void,
  width: number,
  height: number,
  overlays: VideoTextOverlay[]
): Promise<string> {
  if (overlays.length === 0) {
    return Promise.resolve("");
  }
  return new Promise((resolve, reject) => {
    setJob({ width, height, overlays, resolve, reject });
  });
}

export function queueWatermarkOverlay(
  setJob: (job: WatermarkOverlayJob | null) => void,
  width: number,
  height: number,
  label: string,
  options: WatermarkOptions
): Promise<string> {
  if (!hasActiveWatermark(options)) {
    return Promise.resolve("");
  }
  return new Promise((resolve, reject) => {
    setJob({ width, height, label, options, resolve, reject });
  });
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: -10000,
    top: 0,
    opacity: 0,
  },
});
