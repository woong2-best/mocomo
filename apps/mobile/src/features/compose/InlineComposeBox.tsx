import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { searchAll } from "@/api/social";
import { useAuth } from "@/auth/AuthContext";
import {
  DEFAULT_POLL_DURATION_MINUTES,
  POLL_DURATION_OPTIONS,
  type CollaboratorDraft,
  type LocalMediaDraft,
  type PollDraft,
} from "@/features/compose/compose-types";
import { ComposeImageEditor } from "@/features/compose/ComposeImageEditor";
import { ComposeVideoEditor } from "@/features/compose/ComposeVideoEditor";
import { publishComposePost } from "@/features/compose/publish-post";
import { WatermarkToggleRow } from "@/features/compose/WatermarkToggleRow";
import {
  queueWatermarkCapture,
  queueWatermarkOverlay,
  WatermarkCaptureHost,
  WatermarkOverlayHost,
  TextOverlayCaptureHost,
  queueTextOverlay,
  type TextOverlayCaptureJob,
  type WatermarkCaptureJob,
  type WatermarkOverlayJob,
} from "@/lib/apply-image-watermark";
import { probeVideo, processVideoForUpload } from "@/lib/apply-video-watermark";
import {
  buildPostCreditLabel,
  EMPTY_WATERMARK_OPTIONS,
  hasActiveWatermark,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import { prepareImageForUpload } from "@/lib/prepare-image-upload";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  avatarUrl?: string | null;
  avatarLetter?: string;
  /** Called after a successful publish (modal can close). */
  onPosted?: (postId: string) => void;
};

type PickerAsset = {
  uri: string;
  type?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
  width?: number;
  height?: number;
  duration?: number | null;
};

function assetToDraft(asset: PickerAsset): LocalMediaDraft {
  const isVideo = asset.type === "video" || (asset.mimeType?.startsWith("video/") ?? false);
  const ext = isVideo ? "mp4" : "jpg";
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    uri: asset.uri,
    mime: asset.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
    filename: asset.fileName || `${isVideo ? "video" : "photo"}-${Date.now()}.${ext}`,
    type: isVideo ? "VIDEO" : "IMAGE",
    width: asset.width,
    height: asset.height,
    duration: asset.duration ?? undefined,
  };
}

async function loadImagePicker() {
  return import("expo-image-picker");
}

export function InlineComposeBox({ avatarUrl, avatarLetter = "?", onPosted }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const { user } = useAuth();

  const [content, setContent] = useState("");
  const [media, setMedia] = useState<LocalMediaDraft[]>([]);
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorDraft[]>([]);
  const [collabOpen, setCollabOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>(
    EMPTY_WATERMARK_OPTIONS
  );
  const [editorItem, setEditorItem] = useState<LocalMediaDraft | null>(null);
  const [videoEditorItem, setVideoEditorItem] = useState<LocalMediaDraft | null>(null);
  const [captureJob, setCaptureJob] = useState<WatermarkCaptureJob | null>(null);
  const [overlayJob, setOverlayJob] = useState<WatermarkOverlayJob | null>(null);
  const [textOverlayJob, setTextOverlayJob] = useState<TextOverlayCaptureJob | null>(null);

  const watermarkCreditLabel = useMemo(
    () => (user?.username ? buildPostCreditLabel(user.username) : undefined),
    [user?.username]
  );
  const showWatermarkControls = !!(
    watermarkCreditLabel && media.some((m) => m.type === "IMAGE" || m.type === "VIDEO")
  );

  const canPost =
    !busy && (content.trim().length > 0 || media.length > 0 || !!poll);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const appendAssets = useCallback((assets: PickerAsset[]) => {
    if (!assets.length) return;
    const drafts = assets.map(assetToDraft);
    setMedia((prev) => [...prev, ...drafts].slice(0, 8));
    const lastVideo = [...drafts].reverse().find((d) => d.type === "VIDEO");
    if (lastVideo) {
      setVideoEditorItem(lastVideo);
      return;
    }
    const lastImage = [...drafts].reverse().find((d) => d.type === "IMAGE");
    if (lastImage) setEditorItem(lastImage);
  }, []);

  const pickGallery = useCallback(async () => {
    const ImagePicker = await loadImagePicker();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진·동영상 라이브러리 접근을 허용해 주세요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.88,
      videoMaxDuration: 180,
    });
    if (result.canceled) return;
    appendAssets(result.assets);
    focusInput();
  }, [appendAssets, focusInput]);

  const takePhoto = useCallback(async () => {
    const ImagePicker = await loadImagePicker();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "카메라 접근을 허용해 주세요.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      cameraType: ImagePicker.CameraType.back,
      quality: 0.88,
    });
    if (result.canceled) return;
    appendAssets(result.assets);
    focusInput();
  }, [appendAssets, focusInput]);

  const recordVideo = useCallback(async () => {
    const ImagePicker = await loadImagePicker();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "카메라 접근을 허용해 주세요.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["videos"],
      cameraType: ImagePicker.CameraType.back,
      videoMaxDuration: 60,
      quality: 0.85,
    });
    if (result.canceled) return;
    appendAssets(result.assets);
    focusInput();
  }, [appendAssets, focusInput]);

  const togglePoll = useCallback(() => {
    setPoll((prev) =>
      prev
        ? null
        : { options: ["", ""], durationMinutes: DEFAULT_POLL_DURATION_MINUTES }
    );
    focusInput();
  }, [focusInput]);

  const reset = useCallback(() => {
    setContent("");
    setMedia([]);
    setPoll(null);
    setCollaborators([]);
    setIsNsfw(false);
    setWatermarkOptions(EMPTY_WATERMARK_OPTIONS);
  }, []);

  const processMediaForUpload = useCallback(
    async (items: LocalMediaDraft[]) => {
      const out: LocalMediaDraft[] = [];
      for (const item of items) {
        if (item.type === "IMAGE") {
          let next = await prepareImageForUpload(item);
          next = await queueWatermarkCapture(
            setCaptureJob,
            next,
            watermarkCreditLabel ?? "",
            watermarkOptions
          );
          out.push(next);
          continue;
        }
        if (item.type === "VIDEO") {
          let overlayUri: string | null = null;
          let textOverlayUri: string | null = null;
          const probe = await probeVideo(item.uri);
          if (watermarkCreditLabel && hasActiveWatermark(watermarkOptions)) {
            overlayUri = await queueWatermarkOverlay(
              setOverlayJob,
              probe.width,
              probe.height,
              watermarkCreditLabel,
              watermarkOptions
            );
          }
          if (item.videoEdit?.textOverlays?.length) {
            textOverlayUri = await queueTextOverlay(
              setTextOverlayJob,
              probe.width,
              probe.height,
              item.videoEdit.textOverlays
            );
          }
          out.push(
            await processVideoForUpload(
              item,
              watermarkCreditLabel,
              watermarkOptions,
              overlayUri,
              textOverlayUri
            )
          );
          continue;
        }
        out.push(item);
      }
      return out;
    },
    [watermarkCreditLabel, watermarkOptions]
  );

  const onPost = useCallback(async () => {
    if (!canPost) return;
    setBusy(true);
    try {
      const preparedMedia = await processMediaForUpload(media);
      const res = await publishComposePost({
        content,
        media: preparedMedia,
        poll,
        collaborators,
        isNsfw,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
      onPosted?.(res.postId);
      if (res.warning) {
        Alert.alert("게시됨", res.warning);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : e instanceof Error
            ? e.message
            : "게시 실패";
      Alert.alert("오류", msg);
    } finally {
      setBusy(false);
    }
  }, [canPost, collaborators, content, isNsfw, media, onPosted, poll, processMediaForUpload, queryClient, reset]);

  return (
    <View style={styles.wrap}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
      >
      <View style={styles.topRow}>
        <FolkAvatar uri={avatarUrl} name={avatarLetter} size={40} framed={false} />
        <Pressable style={styles.inputHit} onPress={focusInput}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            multiline
            placeholder="What's happening?"
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            editable={!busy}
          />
        </Pressable>
      </View>

      {media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
          {media.map((item) => (
            <View key={item.id} style={styles.mediaItem}>
              <Pressable
                onPress={() => {
                  if (busy) return;
                  if (item.type === "IMAGE") setEditorItem(item);
                  if (item.type === "VIDEO") setVideoEditorItem(item);
                }}
                style={{ flex: 1 }}
              >
                <Image source={{ uri: item.uri }} style={styles.mediaThumb} contentFit="cover" />
                <View style={styles.editBadge}>
                  <Ionicons
                    name={item.type === "VIDEO" ? "film-outline" : "create-outline"}
                    size={11}
                    color="#fff"
                  />
                </View>
              </Pressable>
              {item.type === "VIDEO" ? (
                <View style={styles.videoBadge}>
                  <Ionicons name="videocam" size={12} color="#fff" />
                </View>
              ) : null}
              <Pressable
                style={styles.mediaRemove}
                onPress={() => setMedia((prev) => prev.filter((m) => m.id !== item.id))}
                hitSlop={6}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {showWatermarkControls ? (
        <WatermarkToggleRow
          value={watermarkOptions}
          onChange={setWatermarkOptions}
          disabled={busy}
          creditLabel={watermarkCreditLabel}
        />
      ) : null}

      <View style={styles.nsfwRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nsfwLabel}>NSFW</Text>
          <Text style={styles.nsfwHint}>민감한 콘텐츠가 포함되면 켜 주세요</Text>
        </View>
        <Switch
          value={isNsfw}
          onValueChange={setIsNsfw}
          disabled={busy}
          trackColor={{ true: "#c80000" }}
        />
      </View>

      {poll ? (
        <PollEditor
          value={poll}
          onChange={setPoll}
          onRemove={() => setPoll(null)}
          disabled={busy}
          colors={colors}
        />
      ) : null}

      {collaborators.length > 0 ? (
        <View style={styles.collabChips}>
          {collaborators.map((c) => (
            <Pressable
              key={c.id}
              style={styles.chip}
              onPress={() => setCollaborators((prev) => prev.filter((x) => x.id !== c.id))}
            >
              <Text style={styles.chipText}>@{c.username}</Text>
              <Ionicons name="close" size={12} color={colors.brand} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <View style={styles.icons}>
          <ToolIcon name="image-outline" onPress={() => void pickGallery()} disabled={busy} color={colors.terracotta} />
          <ToolIcon name="camera-outline" onPress={() => void takePhoto()} disabled={busy} color={colors.terracotta} />
          <ToolIcon name="videocam-outline" onPress={() => void recordVideo()} disabled={busy} color={colors.terracotta} />
          <ToolIcon
            name="stats-chart-outline"
            onPress={togglePoll}
            disabled={busy}
            color={poll ? colors.brand : colors.terracotta}
          />
          <ToolIcon
            name="people-outline"
            onPress={() => setCollabOpen(true)}
            disabled={busy}
            color={collaborators.length ? colors.brand : colors.terracotta}
          />
        </View>
        <Pressable
          style={[styles.postBtn, (!canPost || busy) && styles.postBtnDisabled]}
          onPress={() => void onPost()}
          disabled={!canPost || busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.postBtnText}>Post</Text>
          )}
        </Pressable>
      </View>
      </ScrollView>

      <CollaboratorModal
        visible={collabOpen}
        selected={collaborators}
        onClose={() => setCollabOpen(false)}
        onChange={setCollaborators}
      />

      <ComposeImageEditor
        visible={!!editorItem}
        item={editorItem}
        allImages={media.filter((m) => m.type === "IMAGE")}
        watermarkOptions={watermarkOptions}
        onWatermarkChange={setWatermarkOptions}
        creditLabel={watermarkCreditLabel}
        onSwitchImage={(target) => setEditorItem(target)}
        onAddImage={() => void pickGallery()}
        onClose={() => setEditorItem(null)}
        onApply={(next) => {
          setMedia((prev) => prev.map((m) => (m.id === next.id ? next : m)));
        }}
      />

      <ComposeVideoEditor
        visible={!!videoEditorItem}
        item={videoEditorItem}
        watermarkOptions={watermarkOptions}
        onWatermarkChange={setWatermarkOptions}
        creditLabel={watermarkCreditLabel}
        onClose={() => setVideoEditorItem(null)}
        onApply={(next) => {
          setMedia((prev) => prev.map((m) => (m.id === next.id ? next : m)));
          setVideoEditorItem(null);
        }}
      />

      <WatermarkCaptureHost job={captureJob} onDone={() => setCaptureJob(null)} />
      <WatermarkOverlayHost job={overlayJob} onDone={() => setOverlayJob(null)} />
      <TextOverlayCaptureHost job={textOverlayJob} onDone={() => setTextOverlayJob(null)} />
    </View>
  );
}

function ToolIcon({
  name,
  onPress,
  disabled,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  color: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={8} style={{ opacity: disabled ? 0.45 : 1 }}>
      <Ionicons name={name} size={22} color={color} />
    </Pressable>
  );
}

function PollEditor({
  value,
  onChange,
  onRemove,
  disabled,
  colors,
}: {
  value: PollDraft;
  onChange: (p: PollDraft) => void;
  onRemove: () => void;
  disabled?: boolean;
  colors: ThemeColors;
}) {
  return (
    <View
      style={{
        marginTop: 10,
        padding: 12,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.hairline,
        backgroundColor: colors.muted,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 14 }}>투표</Text>
        <Pressable onPress={onRemove} hitSlop={8} disabled={disabled}>
          <Text style={{ color: colors.textMuted, fontWeight: "700" }}>제거</Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        본문이 투표 질문이 됩니다 · 선택지 2~4개
      </Text>
      {value.options.map((opt, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={opt}
            editable={!disabled}
            maxLength={50}
            placeholder={`선택지 ${i + 1}`}
            placeholderTextColor={colors.textMuted}
            onChangeText={(t) => {
              const options = [...value.options];
              options[i] = t;
              onChange({ ...value, options });
            }}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.sm,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: colors.text,
              backgroundColor: colors.surfaceRaised,
            }}
          />
          {value.options.length > 2 ? (
            <Pressable
              disabled={disabled}
              onPress={() =>
                onChange({ ...value, options: value.options.filter((_, idx) => idx !== i) })
              }
            >
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
      ))}
      {value.options.length < 4 ? (
        <Pressable
          disabled={disabled}
          onPress={() => onChange({ ...value, options: [...value.options, ""] })}
        >
          <Text style={{ color: colors.terracotta, fontWeight: "800" }}>+ 선택지 추가</Text>
        </Pressable>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {POLL_DURATION_OPTIONS.map((d) => {
            const active = value.durationMinutes === d.minutes;
            return (
              <Pressable
                key={d.minutes}
                disabled={disabled}
                onPress={() => onChange({ ...value, durationMinutes: d.minutes })}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: radii.pill,
                  backgroundColor: active ? colors.terracotta : colors.surfaceRaised,
                  borderWidth: 1,
                  borderColor: active ? colors.terracotta : colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: active ? "#fff" : colors.textSecondary,
                  }}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

function CollaboratorModal({
  visible,
  selected,
  onClose,
  onChange,
}: {
  visible: boolean;
  selected: CollaboratorDraft[];
  onClose: () => void;
  onChange: (next: CollaboratorDraft[]) => void;
}) {
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CollaboratorDraft[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const term = q.trim();
    if (term.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      setSearching(true);
      void searchAll(term)
        .then((res) => {
          if (cancelled) return;
          setResults(
            res.users.map((u) => ({
              id: u.id,
              username: u.username,
              name: u.name,
              image: u.image,
            }))
          );
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, visible]);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);

  return (
    <KeyboardSheet
      visible={visible}
      onClose={onClose}
      maxHeight="70%"
      sheetStyle={{ backgroundColor: colors.background }}
    >
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: colors.text }}>공동 제작자</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: colors.terracotta, fontWeight: "700" }}>완료</Text>
            </Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="사용자 검색"
            placeholderTextColor={colors.textMuted}
            autoFocus
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radii.md,
              paddingHorizontal: 12,
              paddingVertical: 10,
              color: colors.text,
              backgroundColor: colors.surfaceRaised,
              marginBottom: 10,
            }}
          />
          {searching ? <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 8 }} /> : null}
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }}>
            {results.map((u) => {
              const picked = selectedIds.has(u.id);
              return (
                <Pressable
                  key={u.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingVertical: 10,
                    opacity: picked ? 0.55 : 1,
                  }}
                  onPress={() => {
                    if (picked) {
                      onChange(selected.filter((s) => s.id !== u.id));
                      return;
                    }
                    if (selected.length >= 5) {
                      Alert.alert("제한", "공동 제작자는 최대 5명까지입니다.");
                      return;
                    }
                    onChange([...selected, u]);
                  }}
                >
                  {u.image ? (
                    <Image source={{ uri: u.image }} style={{ width: 36, height: 36, borderRadius: 10 }} />
                  ) : (
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: colors.terracotta,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "800" }}>
                        {(u.name || u.username).slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: colors.text }}>
                      {u.name || u.username}
                    </Text>
                    <Text style={{ color: colors.textMuted }}>@{u.username}</Text>
                  </View>
                  <Ionicons
                    name={picked ? "checkmark-circle" : "add-circle-outline"}
                    size={22}
                    color={picked ? colors.terracotta : colors.brand}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingTop: 12,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
      backgroundColor: colors.background,
    },
    topRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    inputHit: { flex: 1, paddingTop: 8 },
    input: {
      minHeight: 44,
      maxHeight: 140,
      fontSize: 17,
      lineHeight: 22,
      color: colors.text,
      paddingVertical: 0,
      textAlignVertical: "top",
    },
    mediaRow: { marginTop: 10 },
    mediaItem: {
      width: 88,
      height: 88,
      marginRight: 8,
      borderRadius: radii.sm,
      overflow: "hidden",
      backgroundColor: colors.muted,
    },
    mediaThumb: { width: "100%", height: "100%" },
    editBadge: {
      position: "absolute",
      left: 6,
      bottom: 6,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    videoBadge: {
      position: "absolute",
      left: 6,
      bottom: 6,
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    mediaRemove: {
      position: "absolute",
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
    },
    collabChips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.brand,
      backgroundColor: colors.surfaceRaised,
    },
    chipText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
    nsfwRow: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    nsfwLabel: { fontSize: 13, fontWeight: "800", color: colors.text },
    nsfwHint: { marginTop: 2, fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    toolbar: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    icons: { flexDirection: "row", gap: 18, alignItems: "center" },
    postBtn: {
      paddingHorizontal: 20,
      paddingVertical: 8,
      borderRadius: radii.pill,
      backgroundColor: colors.terracotta,
      minWidth: 68,
      alignItems: "center",
    },
    postBtnDisabled: { opacity: 0.45 },
    postBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  });
}
