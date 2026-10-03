import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import {
  DEFAULT_IMAGE_EDIT,
  type ImageEditDraft,
  type LocalMediaDraft,
  type VideoTextOverlay,
} from "@/features/compose/compose-types";
import { WatermarkToggleRow } from "@/features/compose/WatermarkToggleRow";
import {
  buildWatermarkSvg,
  hasActiveWatermark,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import { MOBILE_VIDEO_FILTERS } from "@/lib/video-filters";
import { createComposeEditorStyles } from "@/features/compose/compose-editor-styles";
import { TextColorPicker } from "@/features/compose/TextColorPicker";
import { DEFAULT_TEXT_OVERLAY_COLOR } from "@/features/compose/text-overlay-utils";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type AspectPreset = { id: string; label: string; aspect?: number };

type EditorPanel = "crop" | "adjust" | "filter" | "text" | "overlay" | "audio";

type Props = {
  visible: boolean;
  item: LocalMediaDraft | null;
  allImages: LocalMediaDraft[];
  watermarkOptions: WatermarkOptions;
  onWatermarkChange: (next: WatermarkOptions) => void;
  creditLabel?: string;
  onSwitchImage: (item: LocalMediaDraft) => void;
  onAddImage: () => void;
  onClose: () => void;
  onApply: (next: LocalMediaDraft) => void;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function cloneImageEdit(e: ImageEditDraft): ImageEditDraft {
  return {
    ...e,
    textOverlays: e.textOverlays.map((t) => ({ ...t })),
    audioTrack: e.audioTrack ? { ...e.audioTrack } : null,
  };
}

function centerCropRect(
  width: number,
  height: number,
  aspect: number
): { originX: number; originY: number; width: number; height: number } {
  let cropW = width;
  let cropH = height;
  if (width / height > aspect) cropW = Math.round(height * aspect);
  else cropH = Math.round(width / aspect);
  return {
    originX: Math.round((width - cropW) / 2),
    originY: Math.round((height - cropH) / 2),
    width: cropW,
    height: cropH,
  };
}

export function ComposeImageEditor({
  visible,
  item,
  allImages,
  watermarkOptions,
  onWatermarkChange,
  creditLabel,
  onSwitchImage,
  onAddImage,
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const { t } = useI18n();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createComposeEditorStyles(colors, isDark), [colors, isDark]);

  const aspectPresets = useMemo<AspectPreset[]>(
    () => [
      { id: "free", label: t("m.compose.original") },
      { id: "1:1", label: "1:1", aspect: 1 },
      { id: "4:5", label: "4:5", aspect: 4 / 5 },
      { id: "3:4", label: "3:4", aspect: 3 / 4 },
      { id: "16:9", label: "16:9", aspect: 16 / 9 },
    ],
    [t]
  );

  const imageToolItems = useMemo(
    () =>
      [
        { panel: "overlay" as const, icon: "shield-checkmark-outline" as const, label: t("m.compose.watermark") },
      ] as const,
    [t]
  );

  const [workingUri, setWorkingUri] = useState<string | null>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [edit, setEdit] = useState<ImageEditDraft>(DEFAULT_IMAGE_EDIT);
  const [panel, setPanel] = useState<EditorPanel>("overlay");
  const [showAspectPick, setShowAspectPick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [textModalOpen, setTextModalOpen] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [previewSize, setPreviewSize] = useState({ w: screenW, h: screenW });

  useEffect(() => {
    if (!visible || !item) return;
    setWorkingUri(item.uri);
    setWidth(item.width ?? 0);
    setHeight(item.height ?? 0);
    setEdit(cloneImageEdit(item.imageEdit ?? DEFAULT_IMAGE_EDIT));
    setPanel("overlay");
    setShowAspectPick(false);
    setError("");
    setSelectedTextId(null);
    setBusy(false);
  }, [visible, item?.id, item?.uri]);

  const runManipulate = useCallback(
    async (actions: ImageManipulator.Action[]) => {
      if (!workingUri) return;
      setBusy(true);
      setError("");
      try {
        const result = await ImageManipulator.manipulateAsync(workingUri, actions, {
          compress: 0.92,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        setWorkingUri(result.uri);
        setWidth(result.width);
        setHeight(result.height);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("m.compose.edit_failed"));
      } finally {
        setBusy(false);
      }
    },
    [t, workingUri]
  );

  const onPickAudio = useCallback(async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["audio/mpeg", "audio/mp3", "audio/*"],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setEdit((prev) => ({
        ...prev,
        audioTrack: {
          uri: asset.uri,
          filename: asset.name ?? "audio.mp3",
          volume: 0.85,
        },
      }));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      showIslandError(t("m.common.error"), t("m.compose.could_not_load_audio_file"));
    }
  }, [t]);

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
    setEdit((prev) => ({
      ...prev,
      textOverlays: [...prev.textOverlays, overlay],
    }));
    setSelectedTextId(overlay.id);
    setTextModalOpen(false);
    setTextDraft("");
  }, [textDraft]);

  const saveAndSwitch = useCallback(
    (target: LocalMediaDraft) => {
      if (!item || !workingUri) return;
      onApply({
        ...item,
        uri: workingUri,
        width: width || item.width,
        height: height || item.height,
        mime: "image/jpeg",
        filename: item.filename.replace(/\.\w+$/, ".jpg"),
        imageEdit: cloneImageEdit(edit),
      });
      onSwitchImage(target);
    },
    [edit, height, item, onApply, onSwitchImage, width, workingUri]
  );

  const onDone = useCallback(() => {
    if (!item || !workingUri) return;
    onApply({
      ...item,
      uri: workingUri,
      width: width || item.width,
      height: height || item.height,
      mime: "image/jpeg",
      filename: item.filename.replace(/\.\w+$/, ".jpg"),
      imageEdit: cloneImageEdit(edit),
    });
    onClose();
  }, [edit, height, item, onApply, onClose, width, workingUri]);

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
          <Text style={styles.headerTitle}>{t("m.compose.edit_photo")}</Text>
          <Pressable
            onPress={onDone}
            disabled={busy || !workingUri}
            hitSlop={12}
            style={styles.headerSide}
          >
            <Text style={[styles.sheetDone, (busy || !workingUri) && { opacity: 0.4 }]}>
              {t("m.compose.apply")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.toolIconBar}>
          {imageToolItems.map((tool) => {
            const active = panel === tool.panel;
            return (
              <Pressable
                key={tool.panel}
                onPress={() => {
                  setPanel(tool.panel);
                  setShowAspectPick(false);
                }}
                style={[styles.toolIconBtn, active && styles.toolIconBtnActive]}
              >
                <Ionicons
                  name={tool.icon}
                  size={22}
                  color={active ? colors.terracotta : colors.textMuted}
                />
                <Text style={[styles.toolIconLabel, active && styles.toolIconLabelActive]}>
                  {tool.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.previewFrame}>
          <View
            style={styles.previewWrap}
            onLayout={(e) => {
              const { width: w, height: h } = e.nativeEvent.layout;
              setPreviewSize({ w, h });
            }}
          >
          {workingUri ? (
            <Image source={{ uri: workingUri }} style={StyleSheet.absoluteFill} contentFit="contain" />
          ) : null}

          {watermarkSvg ? (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <SvgXml xml={watermarkSvg} width={previewSize.w} height={previewSize.h} />
            </View>
          ) : null}

          {busy ? (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.terracotta} size="large" />
            </View>
          ) : null}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {panel === "crop" ? (
          <View style={styles.cropBar}>
            {showAspectPick ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.aspectRow}>
                {aspectPresets.map((preset) => (
                  <Pressable
                    key={preset.id}
                    disabled={busy || !preset.aspect || !width || !height}
                    onPress={() => {
                      if (!preset.aspect) return;
                      setShowAspectPick(false);
                      void runManipulate([{ crop: centerCropRect(width, height, preset.aspect) }]);
                    }}
                    style={[styles.aspectChip, !preset.aspect && styles.aspectChipMuted]}
                  >
                    <Text style={styles.aspectText}>{preset.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.cropActions}>
              <View style={styles.cropActionGroup}>
                <MiniAction icon="refresh-outline" label="↺" onPress={() => void runManipulate([{ rotate: -90 }])} styles={styles} colors={colors} />
                <MiniAction icon="refresh" label="↻" onPress={() => void runManipulate([{ rotate: 90 }])} styles={styles} colors={colors} />
              </View>
              <Pressable
                onPress={() => setShowAspectPick((v) => !v)}
                style={styles.cropAspectBtn}
                disabled={busy}
              >
                <Ionicons name="crop-outline" size={22} color={colors.brand} />
                <Text style={styles.cropAspectLabel}>{t("m.common.free")}</Text>
              </Pressable>
              <View style={styles.cropActionGroup}>
                <MiniAction
                  icon="swap-horizontal-outline"
                  label={t("m.compose.flip_h")}
                  onPress={() => void runManipulate([{ flip: ImageManipulator.FlipType.Horizontal }])}
                  styles={styles}
                  colors={colors}
                />
                <MiniAction
                  icon="swap-vertical-outline"
                  label={t("m.compose.flip_v")}
                  onPress={() => void runManipulate([{ flip: ImageManipulator.FlipType.Vertical }])}
                  styles={styles}
                  colors={colors}
                />
              </View>
            </View>
          </View>
        ) : null}

        {panel === "audio" ? (
          <View style={styles.sheetBody}>
            <Pressable style={styles.trackRow} onPress={() => void onPickAudio()}>
              <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
              <Text style={styles.trackLabel}>
                {edit.audioTrack ? `🎵 ${edit.audioTrack.filename}` : t("m.compose.choose_mp3_file")}
              </Text>
              {edit.audioTrack ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => setEdit((p) => ({ ...p, audioTrack: null }))}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        {panel === "text" ? (
          <View style={styles.sheetBody}>
            <Pressable style={styles.trackRow} onPress={onAddText}>
              <Ionicons name="add-circle-outline" size={20} color={colors.brand} />
              <Text style={styles.trackLabel}>
                {edit.textOverlays.length > 0
                  ? t("m.compose.length_text_overlay_s_tap_to", { length: String(edit.textOverlays.length) })
                  : t("m.compose.add_text")}
              </Text>
            </Pressable>
            {selectedTextId ? (
              <>
                <Text style={styles.textColorLabel}>{t("m.compose.text_color")}</Text>
                <TextColorPicker
                  value={
                    edit.textOverlays.find((t) => t.id === selectedTextId)?.color ??
                    DEFAULT_TEXT_OVERLAY_COLOR
                  }
                  onChange={(color) => {
                    setEdit((p) => ({
                      ...p,
                      textOverlays: p.textOverlays.map((t) =>
                        t.id === selectedTextId ? { ...t, color } : t
                      ),
                    }));
                  }}
                  styles={styles}
                />
                <Pressable
                  style={styles.sheetMutedBtn}
                  onPress={() => {
                    setEdit((p) => ({
                      ...p,
                      textOverlays: p.textOverlays.filter((t) => t.id !== selectedTextId),
                    }));
                    setSelectedTextId(null);
                  }}
                >
                  <Text style={styles.sheetMutedBtnText}>{t("m.compose.delete_selected_text")}</Text>
                </Pressable>
              </>
            ) : edit.textOverlays.length > 0 ? (
              <Text style={styles.sheetHint}>
                {t("m.compose.tap_text_in_the_preview_to")}
              </Text>
            ) : null}
          </View>
        ) : null}

        {panel === "overlay" ? (
          <View style={styles.sheetBody}>
            {creditLabel ? (
              <WatermarkToggleRow
                value={watermarkOptions}
                onChange={onWatermarkChange}
                creditLabel={creditLabel}
              />
            ) : (
              <Text style={styles.sheetHint}>
                {t("m.compose.sign_in_to_use_watermarks")}
              </Text>
            )}
          </View>
        ) : null}

        {panel === "filter" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {MOBILE_VIDEO_FILTERS.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setEdit((p) => ({ ...p, filterId: f.id }))}
                style={styles.filterChip}
              >
                <View
                  style={[
                    styles.filterPreview,
                    f.preview
                      ? { backgroundColor: f.preview.color, opacity: 0.35 + f.preview.opacity }
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
                  {f.id === "none" ? t("m.compose.original") : f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {panel === "adjust" ? (
          <View style={styles.sheetBody}>
            <AdjustRow
              label={t("m.compose.brightness")}
              value={edit.brightness}
              onChange={(v) => setEdit((p) => ({ ...p, brightness: v }))}
              styles={styles}
            />
            <AdjustRow
              label={t("m.compose.contrast")}
              value={edit.contrast}
              onChange={(v) => setEdit((p) => ({ ...p, contrast: v }))}
              styles={styles}
            />
            <AdjustRow
              label={t("m.compose.saturation")}
              value={edit.saturation}
              onChange={(v) => setEdit((p) => ({ ...p, saturation: v }))}
              styles={styles}
            />
          </View>
        ) : null}

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbRow}>
            {allImages.map((img) => {
              const active = img.id === item.id;
              return (
                <Pressable
                  key={img.id}
                  onPress={() => {
                    if (active) return;
                    saveAndSwitch(img);
                  }}
                  style={[styles.thumb, active && styles.thumbActive]}
                >
                  <Image source={{ uri: img.uri }} style={styles.thumbImg} contentFit="cover" />
                </Pressable>
              );
            })}
            <Pressable style={styles.addThumb} onPress={onAddImage}>
              <Ionicons name="add" size={26} color={colors.brand} />
            </Pressable>
          </ScrollView>
          <Pressable
            style={[styles.nextBtn, (busy || !workingUri) && styles.nextBtnDisabled]}
            onPress={onDone}
            disabled={busy || !workingUri}
          >
            <Text style={styles.nextBtnText}>{t("common.next")}</Text>
          </Pressable>
        </View>

        <Modal visible={textModalOpen} transparent animationType="fade">
          <View style={styles.textModalRoot}>
            <View style={styles.textModalCard}>
              <Text style={styles.textModalTitle}>{t("m.compose.add_text")}</Text>
              <TextInput
                style={styles.textModalInput}
                placeholder={t("m.compose.enter_text")}
                placeholderTextColor={colors.textMuted}
                value={textDraft}
                onChangeText={setTextDraft}
                autoFocus
                maxLength={120}
              />
              <View style={styles.textModalActions}>
                <Pressable onPress={() => setTextModalOpen(false)}>
                  <Text style={styles.sheetCancel}>{t("toast.cancel")}</Text>
                </Pressable>
                <Pressable onPress={confirmAddText}>
                  <Text style={styles.sheetDone}>{t("m.common.add")}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

function AdjustRow({
  label,
  value,
  onChange,
  styles,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  styles: ReturnType<typeof createComposeEditorStyles>;
}) {
  return (
    <View style={styles.adjustRow}>
      <Text style={styles.adjustLabel}>{label}</Text>
      <View style={styles.adjustBtns}>
        <Pressable onPress={() => onChange(clamp(value - 10, -100, 100))} style={styles.adjustBtn}>
          <Text style={styles.adjustBtnText}>−</Text>
        </Pressable>
        <Text style={styles.adjustValue}>{value}</Text>
        <Pressable onPress={() => onChange(clamp(value + 10, -100, 100))} style={styles.adjustBtn}>
          <Text style={styles.adjustBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MiniAction({
  icon,
  label,
  onPress,
  styles,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createComposeEditorStyles>;
  colors: ThemeColors;
}) {
  return (
    <Pressable onPress={onPress} style={styles.miniAction}>
      <Ionicons name={icon} size={18} color={colors.brand} />
      <Text style={styles.miniActionLabel}>{label}</Text>
    </Pressable>
  );
}
