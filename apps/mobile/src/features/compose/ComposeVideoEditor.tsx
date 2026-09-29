import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import {
  DEFAULT_VIDEO_EDIT,
  type LocalMediaDraft,
  type VideoEditDraft,
} from "@/features/compose/compose-types";
import { WatermarkToggleRow } from "@/features/compose/WatermarkToggleRow";
import { probeVideo } from "@/lib/apply-video-watermark";
import {
  buildWatermarkSvg,
  hasActiveWatermark,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import { createComposeEditorStyles } from "@/features/compose/compose-editor-styles";
import { useTheme } from "@/theme/ThemeContext";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  item: LocalMediaDraft | null;
  watermarkOptions: WatermarkOptions;
  onWatermarkChange: (next: WatermarkOptions) => void;
  creditLabel?: string;
  onClose: () => void;
  onApply: (next: LocalMediaDraft) => void;
};

function formatSec(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function cloneEdit(e: VideoEditDraft): VideoEditDraft {
  return {
    ...e,
    textOverlays: e.textOverlays.map((t) => ({ ...t })),
    audioTrack: e.audioTrack ? { ...e.audioTrack } : null,
  };
}

export function ComposeVideoEditor({
  visible,
  item,
  watermarkOptions,
  onWatermarkChange,
  creditLabel,
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { u } = useI18n();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createComposeEditorStyles(colors, isDark), [colors, isDark]);

  const [edit, setEdit] = useState<VideoEditDraft>(DEFAULT_VIDEO_EDIT);
  const [history, setHistory] = useState<VideoEditDraft[]>([DEFAULT_VIDEO_EDIT]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [durationSec, setDurationSec] = useState(60);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(true);
  const [previewSize, setPreviewSize] = useState({ w: screenW, h: screenW * 1.2 });

  const player = useVideoPlayer(item?.uri ?? "", (p) => {
    p.loop = true;
    p.muted = false;
  });

  const undo = useCallback(() => {
    if (historyIdx <= 0) return;
    const nextIdx = historyIdx - 1;
    setHistoryIdx(nextIdx);
    setEdit(cloneEdit(history[nextIdx]!));
  }, [history, historyIdx]);

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return;
    const nextIdx = historyIdx + 1;
    setHistoryIdx(nextIdx);
    setEdit(cloneEdit(history[nextIdx]!));
  }, [history, historyIdx]);

  useEffect(() => {
    if (!visible || !item) return;
    setError("");
    setPlaying(true);
    setLoadingMeta(true);
    const base = item.videoEdit ?? DEFAULT_VIDEO_EDIT;
    void probeVideo(item.uri)
      .then((probe) => {
        const dur = probe.durationSec;
        setDurationSec(dur);
        const initial = cloneEdit({
          ...base,
          endSec: base.endSec > base.startSec ? Math.min(base.endSec, dur) : dur,
        });
        setEdit(initial);
        setHistory([initial]);
        setHistoryIdx(0);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : u("영상 정보 로드 실패", "Could not load video info"));
        const fallback = cloneEdit(base);
        setEdit(fallback);
        setHistory([fallback]);
        setHistoryIdx(0);
      })
      .finally(() => setLoadingMeta(false));
  }, [visible, item]);

  useEffect(() => {
    if (!visible || !item) return;
    player.replace(item.uri);
    if (playing) player.play();
    else player.pause();
    return () => {
      player.pause();
    };
  }, [visible, item, player]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  const onDone = useCallback(() => {
    if (!item) return;
    onApply({
      ...item,
      videoEdit: edit,
      duration: Math.round(edit.endSec - edit.startSec),
    });
    onClose();
  }, [edit, item, onApply, onClose]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const watermarkSvg =
    creditLabel && hasActiveWatermark(watermarkOptions)
      ? buildWatermarkSvg(
          Math.round(previewSize.w),
          Math.round(previewSize.h),
          creditLabel,
          watermarkOptions
        )
      : null;

  if (!item) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerSide}>
            <Ionicons name="chevron-back" size={26} color={colors.terracotta} />
          </Pressable>
          <Text style={styles.headerTitle}>{u("영상 편집", "Edit video")}</Text>
          <Pressable onPress={onDone} hitSlop={12} style={styles.headerSide}>
            <View style={styles.topDoneBtn}>
              <Ionicons name="checkmark" size={22} color={colors.textOnAccent} />
            </View>
          </Pressable>
        </View>

        <View style={styles.previewFrame}>
          <View
            style={styles.previewWrap}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setPreviewSize({ w: width, h: height });
            }}
          >
          <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay}>
            <VideoView
              style={StyleSheet.absoluteFill}
              player={player}
              contentFit="contain"
              nativeControls={false}
            />
          </Pressable>

          {watermarkSvg ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <SvgXml xml={watermarkSvg} width={previewSize.w} height={previewSize.h} />
            </View>
          ) : null}

          {!playing ? (
            <View pointerEvents="none" style={styles.pauseBadge}>
              <Ionicons name="play" size={52} color="rgba(255,255,255,0.92)" />
            </View>
          ) : null}

          {loadingMeta ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.terracotta} size="large" />
            </View>
          ) : null}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.playbackRow}>
          <Pressable onPress={togglePlay} hitSlop={10}>
            <Ionicons name={playing ? "pause" : "play"} size={22} color={colors.brand} />
          </Pressable>
          <Text style={styles.timeText}>
            {formatSec(edit.startSec)} / {formatSec(durationSec)}
          </Text>
          <View style={styles.playbackActions}>
            <Pressable onPress={undo} disabled={historyIdx <= 0} hitSlop={8}>
              <Ionicons
                name="arrow-undo"
                size={20}
                color={historyIdx <= 0 ? colors.textMuted : colors.brand}
              />
            </Pressable>
            <Pressable
              onPress={redo}
              disabled={historyIdx >= history.length - 1}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-redo"
                size={20}
                color={
                  historyIdx >= history.length - 1 ? colors.textMuted : colors.brand
                }
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
          {creditLabel ? (
            <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
              <WatermarkToggleRow
                value={watermarkOptions}
                onChange={onWatermarkChange}
                creditLabel={creditLabel}
              />
            </View>
          ) : (
            <Text style={styles.sheetMuted}>
              {u("로그인 후 워터마크를 사용할 수 있습니다.", "Sign in to use watermarks.")}
            </Text>
          )}
          <View style={styles.sheetActions}>
            <Text style={styles.sheetTitle}>{u("워터마크", "Watermark")}</Text>
          </View>
        </View>

      </View>
    </Modal>
  );
}
