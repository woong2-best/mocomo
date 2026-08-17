import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import {
  DEFAULT_VIDEO_EDIT,
  type LocalMediaDraft,
  type VideoEditDraft,
  type VideoTextOverlay,
} from "@/features/compose/compose-types";
import { WatermarkToggleRow } from "@/features/compose/WatermarkToggleRow";
import { probeVideo } from "@/lib/apply-video-watermark";
import {
  buildWatermarkSvg,
  hasActiveWatermark,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import { MOBILE_VIDEO_FILTERS, getVideoFilter } from "@/lib/video-filters";
import { createComposeEditorStyles } from "@/features/compose/compose-editor-styles";
import { TextColorPicker } from "@/features/compose/TextColorPicker";
import { TextOverlayDraggable } from "@/features/compose/TextOverlayDraggable";
import { DEFAULT_TEXT_OVERLAY_COLOR } from "@/features/compose/text-overlay-utils";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  item: LocalMediaDraft | null;
  watermarkOptions: WatermarkOptions;
  onWatermarkChange: (next: WatermarkOptions) => void;
  creditLabel?: string;
  onClose: () => void;
  onApply: (next: LocalMediaDraft) => void;
};

type EditorPanel = "main" | "filter" | "watermark";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

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
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createComposeEditorStyles(colors, isDark), [colors, isDark]);

  const [edit, setEdit] = useState<VideoEditDraft>(DEFAULT_VIDEO_EDIT);
  const [history, setHistory] = useState<VideoEditDraft[]>([DEFAULT_VIDEO_EDIT]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [durationSec, setDurationSec] = useState(60);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [error, setError] = useState("");
  const [panel, setPanel] = useState<EditorPanel>("main");
  const [playing, setPlaying] = useState(true);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [previewSize, setPreviewSize] = useState({ w: screenW, h: screenW * 1.2 });

  const player = useVideoPlayer(item?.uri ?? "", (p) => {
    p.loop = true;
    p.muted = false;
  });

  const pushEdit = useCallback(
    (next: VideoEditDraft) => {
      setEdit(next);
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIdx + 1);
        return [...trimmed, cloneEdit(next)];
      });
      setHistoryIdx((i) => i + 1);
    },
    [historyIdx]
  );

  const patchEdit = useCallback(
    (patch: Partial<VideoEditDraft>) => {
      pushEdit({ ...edit, ...patch });
    },
    [edit, pushEdit]
  );

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
    setPanel("main");
    setPlaying(true);
    setSelectedTextId(null);
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
        setError(e instanceof Error ? e.message : "영상 정보 로드 실패");
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

  const filterPreset = getVideoFilter(edit.filterId);

  const onPickAudio = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/mp3", "audio/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      patchEdit({
        audioTrack: {
          uri: asset.uri,
          filename: asset.name ?? "audio.mp3",
          volume: 0.85,
        },
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("오류", "오디오 파일을 불러오지 못했습니다.");
    }
  }, [patchEdit]);

  const onAddText = useCallback(() => {
    setTextDraft("");
    setTextModalOpen(true);
  }, []);

  const confirmAddText = useCallback(() => {
    const text = textDraft.trim();
    if (!text) {
      setTextModalOpen(false);
      return;
    }
    const overlay: VideoTextOverlay = {
      id: `txt-${Date.now()}`,
      text,
      x: 0.5,
      y: 0.5,
      scale: 1,
      color: DEFAULT_TEXT_OVERLAY_COLOR,
    };
    patchEdit({ textOverlays: [...edit.textOverlays, overlay] });
    setSelectedTextId(overlay.id);
    setTextModalOpen(false);
    setTextDraft("");
  }, [edit.textOverlays, patchEdit, textDraft]);

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

  const videoW = item.width || previewSize.w;
  const videoH = item.height || previewSize.h;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.headerSide}>
            <Ionicons name="chevron-back" size={26} color={colors.terracotta} />
          </Pressable>
          <Text style={styles.headerTitle}>영상 편집</Text>
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

          {filterPreset.preview ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: filterPreset.preview.color,
                  opacity: filterPreset.preview.opacity,
                },
              ]}
            />
          ) : null}

          {watermarkSvg ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <SvgXml xml={watermarkSvg} width={previewSize.w} height={previewSize.h} />
            </View>
          ) : null}

          {edit.textOverlays.map((o) => (
            <TextOverlayDraggable
              key={o.id}
              overlay={o}
              selected={selectedTextId === o.id}
              containerW={previewSize.w}
              containerH={previewSize.h}
              imageW={videoW}
              imageH={videoH}
              onSelect={() => setSelectedTextId(o.id)}
              onMove={(x, y) => {
                const next = edit.textOverlays.map((t) =>
                  t.id === o.id ? { ...t, x, y } : t
                );
                setEdit({ ...edit, textOverlays: next });
              }}
            />
          ))}

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

        <View style={styles.timelineBlock}>
          <View style={styles.trackRow}>
            <View style={styles.trackThumbStrip}>
              <Ionicons name="videocam-outline" size={14} color={colors.brand} />
              <Text style={styles.trackHint} numberOfLines={1}>
                {formatSec(edit.startSec)} – {formatSec(edit.endSec)}
              </Text>
            </View>
            <View style={styles.trimActions}>
              <MiniBtn label="−" onPress={() => patchEdit({ startSec: edit.startSec + 1 })} styles={styles} />
              <MiniBtn label="+" onPress={() => patchEdit({ endSec: edit.endSec - 1 })} styles={styles} />
            </View>
          </View>

          <Pressable style={styles.trackRow} onPress={() => void onPickAudio()}>
            <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
            <Text style={styles.trackLabel} numberOfLines={1}>
              {edit.audioTrack ? `🎵 ${edit.audioTrack.filename}` : "오디오 추가"}
            </Text>
            {edit.audioTrack ? (
              <Pressable hitSlop={8} onPress={() => patchEdit({ audioTrack: null })}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>

          <Pressable style={styles.trackRow} onPress={onAddText}>
            <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
            <Text style={styles.trackLabel}>
              {edit.textOverlays.length > 0
                ? `텍스트 ${edit.textOverlays.length}개`
                : "텍스트 추가"}
            </Text>
            {selectedTextId ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  patchEdit({
                    textOverlays: edit.textOverlays.filter((t) => t.id !== selectedTextId),
                  });
                  setSelectedTextId(null);
                }}
              >
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </Pressable>

          {selectedTextId ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.textColorLabel}>글자 색</Text>
              <TextColorPicker
                value={
                  edit.textOverlays.find((t) => t.id === selectedTextId)?.color ??
                  DEFAULT_TEXT_OVERLAY_COLOR
                }
                onChange={(color) => {
                  patchEdit({
                    textOverlays: edit.textOverlays.map((t) =>
                      t.id === selectedTextId ? { ...t, color } : t
                    ),
                  });
                }}
                styles={styles}
              />
            </View>
          ) : null}

          <Text style={styles.timelineHint}>
            트랙을 눌러 편집 · 영상 탭으로 재생/일시정지
          </Text>
        </View>

        {panel === "filter" ? (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 8 }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {MOBILE_VIDEO_FILTERS.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => patchEdit({ filterId: f.id })}
                  style={styles.filterChip}
                >
                  <View
                    style={[
                      styles.filterPreview,
                      f.preview
                        ? {
                            backgroundColor: f.preview.color,
                            opacity: 0.35 + f.preview.opacity,
                          }
                        : { backgroundColor: "#333" },
                      edit.filterId === f.id && styles.filterPreviewActive,
                    ]}
                  />
                  <Text
                    style={[
                      styles.filterLabel,
                      edit.filterId === f.id && styles.filterLabelActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setPanel("main")}>
                <Text style={styles.sheetCancel}>취소</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>필터</Text>
              <Pressable onPress={() => setPanel("main")}>
                <Text style={styles.sheetDone}>완료</Text>
              </Pressable>
            </View>
          </View>
        ) : panel === "watermark" ? (
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
              <Text style={styles.sheetMuted}>로그인 후 워터마크를 사용할 수 있습니다.</Text>
            )}
            <View style={styles.sheetActions}>
              <Pressable onPress={() => setPanel("main")}>
                <Text style={styles.sheetCancel}>취소</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>워터마크</Text>
              <Pressable onPress={() => setPanel("main")}>
                <Text style={styles.sheetDone}>완료</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.videoToolbar, { paddingBottom: insets.bottom + 10 }]}>
            <VideoToolItem icon="musical-note-outline" label="오디오" onPress={() => void onPickAudio()} colors={colors} styles={styles} />
            <VideoToolItem icon="color-filter-outline" label="필터" onPress={() => setPanel("filter")} colors={colors} styles={styles} />
            <VideoToolItem
              icon="shield-checkmark-outline"
              label="워터마크"
              onPress={() => setPanel("watermark")}
              colors={colors}
              styles={styles}
            />
            <VideoToolItem icon="text-outline" label="텍스트" onPress={onAddText} colors={colors} styles={styles} />
          </View>
        )}

        <Modal visible={textModalOpen} transparent animationType="fade">
          <View style={styles.textModalRoot}>
            <View style={styles.textModalCard}>
              <Text style={styles.textModalTitle}>텍스트 추가</Text>
              <TextInput
                style={styles.textModalInput}
                placeholder="내용 입력"
                placeholderTextColor={colors.textMuted}
                value={textDraft}
                onChangeText={setTextDraft}
                autoFocus
                maxLength={120}
              />
              <View style={styles.textModalActions}>
                <Pressable onPress={() => setTextModalOpen(false)}>
                  <Text style={styles.sheetCancel}>취소</Text>
                </Pressable>
                <Pressable onPress={confirmAddText}>
                  <Text style={styles.sheetDone}>추가</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

function VideoToolItem({
  icon,
  label,
  onPress,
  colors,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof createComposeEditorStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={styles.videoToolItem}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <Text style={styles.videoToolLabel}>{label}</Text>
    </Pressable>
  );
}

function MiniBtn({
  label,
  onPress,
  styles,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createComposeEditorStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={styles.miniBtn}>
      <Text style={styles.miniBtnText}>{label}</Text>
    </Pressable>
  );
}
