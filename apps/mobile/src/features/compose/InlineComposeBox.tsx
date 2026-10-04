import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
  getPollDurationOptions,
  type CollaboratorDraft,
  type LocalMediaDraft,
  type PollDraft,
} from "@/features/compose/compose-types";
import { publishComposePost } from "@/features/compose/publish-post";
import { resetFeedPostOffset } from "@/features/feed/feed-post-offset";
import type {
  TextOverlayCaptureJob,
  WatermarkCaptureJob,
  WatermarkOverlayJob,
} from "@/lib/apply-image-watermark";
import {
  buildPostCreditLabel,
  EMPTY_WATERMARK_OPTIONS,
  hasActiveWatermark,
  optionsFromWatermarkSettings,
  type WatermarkOptions,
} from "@/lib/media-watermark";
import { prepareImageForUpload } from "@/lib/prepare-image-upload";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import type { MenuAnchor } from "@/features/feed/FeedPostOverflowMenu";
import { ComposeAttachModal } from "@/features/compose/ComposeAttachModal";
import { ComposeQuotePreview } from "@/features/compose/ComposeQuotePreview";
import { formatSaleMoco } from "@/lib/money";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { NsfwToggleButton } from "@/ui/NsfwToggleButton";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { FeedImageLightbox } from "@/features/feed/FeedImageLightbox";
import { showIslandError, showIslandToast } from "@/ui/IslandToast"
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  avatarUrl?: string | null;
  avatarLetter?: string;
  /** Prefill body (e.g. quote repost draft). */
  initialContent?: string;
  quotedPostId?: string;
  quotedAuthorUsername?: string;
  quotedPreview?: string;
  autoFocus?: boolean;
  /** Called after a successful publish (modal can close). */
  onPosted?: (postId: string) => void | Promise<void>;
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

function WatermarkJobHosts({
  mod,
  captureJob,
  overlayJob,
  textOverlayJob,
  onCaptureDone,
  onOverlayDone,
  onTextDone,
}: {
  mod: typeof import("@/lib/apply-image-watermark");
  captureJob: WatermarkCaptureJob | null;
  overlayJob: WatermarkOverlayJob | null;
  textOverlayJob: TextOverlayCaptureJob | null;
  onCaptureDone: () => void;
  onOverlayDone: () => void;
  onTextDone: () => void;
}) {
  const CaptureHost = mod.WatermarkCaptureHost;
  const OverlayHost = mod.WatermarkOverlayHost;
  const TextHost = mod.TextOverlayCaptureHost;
  return (
    <>
      <CaptureHost job={captureJob} onDone={onCaptureDone} />
      <OverlayHost job={overlayJob} onDone={onOverlayDone} />
      <TextHost job={textOverlayJob} onDone={onTextDone} />
    </>
  );
}

export function InlineComposeBox({
  avatarUrl,
  avatarLetter = "?",
  initialContent,
  quotedPostId,
  quotedAuthorUsername,
  quotedPreview,
  autoFocus = false,
  onPosted,
}: Props) {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pollDurationOptions = useMemo(() => getPollDurationOptions(locale), [locale]);
  const queryClient = useQueryClient();
  const inputRef = useRef<TextInput>(null);
  const collabAnchorRef = useRef<View>(null);
  const [collabAnchor, setCollabAnchor] = useState<MenuAnchor | null>(null);
  const { user } = useAuth();
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();

  const [content, setContent] = useState("");
  const [media, setMedia] = useState<LocalMediaDraft[]>([]);
  const [poll, setPoll] = useState<PollDraft | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorDraft[]>([]);
  const [collabOpen, setCollabOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isNsfw, setIsNsfw] = useState(false);
  const [quotedSourceNsfw, setQuotedSourceNsfw] = useState(false);
  const isQuoteCompose = Boolean(quotedPostId);
  const [watermarkOptions, setWatermarkOptions] = useState<WatermarkOptions>(
    EMPTY_WATERMARK_OPTIONS
  );
  const [captureJob, setCaptureJob] = useState<WatermarkCaptureJob | null>(null);
  const [overlayJob, setOverlayJob] = useState<WatermarkOverlayJob | null>(null);
  const [textOverlayJob, setTextOverlayJob] = useState<TextOverlayCaptureJob | null>(null);
  const [mediaLightbox, setMediaLightbox] = useState<{ open: boolean; index: number }>({
    open: false,
    index: 0,
  });
  const [attachOpen, setAttachOpen] = useState(false);
  const [attachPicked, setAttachPicked] = useState<PickerAsset[]>([]);
  const [watermarkMod, setWatermarkMod] = useState<typeof import("@/lib/apply-image-watermark") | null>(
    null
  );
  const watermarkModRef = useRef<typeof import("@/lib/apply-image-watermark") | null>(null);

  const ensureWatermarkModule = useCallback(async () => {
    if (watermarkModRef.current) return watermarkModRef.current;
    const mod = await import("@/lib/apply-image-watermark");
    watermarkModRef.current = mod;
    setWatermarkMod(mod);
    await new Promise((resolve) => setTimeout(resolve, 32));
    return mod;
  }, []);

  const watermarkCreditLabel = useMemo(
    () => (user?.username ? buildPostCreditLabel(user.username) : undefined),
    [user?.username]
  );

  useEffect(() => {
    const prefs = user?.preferences;
    setWatermarkOptions(
      optionsFromWatermarkSettings(
        prefs?.watermarkInsertEnabled === true,
        prefs?.watermarkPlacement ?? null
      )
    );
  }, [user?.preferences?.watermarkInsertEnabled, user?.preferences?.watermarkPlacement]);
  const canPost =
    !busy && (content.trim().length > 0 || media.length > 0 || !!poll || !!quotedPostId);

  const composeLightboxImages = useMemo(
    () =>
      media.map((m) => ({
        id: m.id,
        url: m.uri,
        kind: m.type === "VIDEO" ? ("video" as const) : ("image" as const),
      })),
    [media]
  );

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (quotedPostId) {
      setContent("");
      setQuotedSourceNsfw(false);
      if (autoFocus) {
        const t = setTimeout(() => focusInput(), 120);
        return () => clearTimeout(t);
      }
      return;
    }
    if (!initialContent?.length) return;
    setContent(initialContent);
    if (autoFocus) {
      const t = setTimeout(() => focusInput(), 120);
      return () => clearTimeout(t);
    }
  }, [autoFocus, focusInput, initialContent, quotedPostId]);

  const appendAssets = useCallback((assets: PickerAsset[]) => {
    if (!assets.length) return;
    const drafts = assets.map(assetToDraft);
    setMedia((prev) => [...prev, ...drafts].slice(0, 8));
  }, []);

  const pickGallery = useCallback(async () => {
    const ImagePicker = await loadImagePicker();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.common.permission_required"), t("m.compose.allow_access_to_your_photo_and"));
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
  }, [appendAssets, focusInput, t]);

  const pickAttachMedia = useCallback(async () => {
    const ImagePicker = await loadImagePicker();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.common.permission_required"), t("m.compose.allow_access_to_your_photo_and"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 8,
      quality: 0.88,
      videoMaxDuration: 180,
    });
    if (result.canceled || result.assets.length === 0) return;
    setAttachPicked(result.assets);
  }, [t]);

  const confirmAttach = useCallback(
    (priceKrw: number) => {
      if (!attachPicked.length) return;
      const drafts = attachPicked.map((asset) => ({ ...assetToDraft(asset), priceKrw }));
      setMedia((prev) => [...prev, ...drafts].slice(0, 8));
      setAttachPicked([]);
      setAttachOpen(false);
      focusInput();
    },
    [attachPicked, focusInput]
  );

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
          const mod = await ensureWatermarkModule();
          next = await mod.queueWatermarkCapture(
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
          const mod = await ensureWatermarkModule();
          const { probeVideo, processVideoForUpload } = await import("@/lib/apply-video-watermark");
          const probe = await probeVideo(item.uri);
          if (watermarkCreditLabel && hasActiveWatermark(watermarkOptions)) {
            overlayUri = await mod.queueWatermarkOverlay(
              setOverlayJob,
              probe.width,
              probe.height,
              watermarkCreditLabel,
              watermarkOptions
            );
          }
          if (item.videoEdit?.textOverlays?.length) {
            textOverlayUri = await mod.queueTextOverlay(
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
    [ensureWatermarkModule, watermarkCreditLabel, watermarkOptions]
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
        isNsfw: isNsfw || quotedSourceNsfw,
        quotedPostId,
        locale,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      if (onPosted) {
        await onPosted(res.postId);
      } else {
        resetFeedPostOffset();
        await queryClient.resetQueries({ queryKey: ["mobile-feed"] });
      }
      await queryClient.invalidateQueries({ queryKey: ["mobile-user"] });
      if (res.warning) {
        showIslandToast("Posted", res.warning);
      }
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : e instanceof Error
            ? e.message
            : t("m.compose.post_failed");
      showIslandError(t("m.common.error"), msg);
    } finally {
      setBusy(false);
    }
  }, [
    canPost,
    collaborators,
    content,
    isNsfw,
    media,
    onPosted,
    poll,
    processMediaForUpload,
    queryClient,
    quotedPostId,
    quotedSourceNsfw,
    locale,
    reset,
    t,
  ]);

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
        <Pressable
          onPress={() => {
            if (!user?.username) return;
            openUserProfile({
              username: user.username,
              name: user.name,
              image: user.image,
            });
          }}
          onPressIn={() => {
            if (!user?.username) return;
            prefetchUserProfile({
              username: user.username,
              name: user.name,
              image: user.image,
            });
          }}
          disabled={!user?.username}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={t("common.myProfile")}
          style={({ pressed }) => [styles.avatarHit, pressed && styles.avatarHitPressed]}
        >
          <FolkAvatar uri={avatarUrl} name={avatarLetter} size={40} framed={false} />
        </Pressable>
        <View style={styles.inputColumn}>
        <Pressable style={styles.inputHit} onPress={focusInput}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            multiline
            placeholder="Dreaming of what?"
            placeholderTextColor={colors.textMuted}
            value={content}
            onChangeText={setContent}
            editable={!busy}
          />
        </Pressable>
        {quotedPostId ? (
          <ComposeQuotePreview
            postId={quotedPostId}
            onLoaded={(p) => setQuotedSourceNsfw(!!p.isNsfw)}
          />
        ) : null}
        </View>
      </View>

      {media.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
          {media.map((item, itemIndex) => (
            <View key={item.id} style={styles.mediaItem}>
              <Pressable
                style={styles.mediaThumbHit}
                onPress={() => setMediaLightbox({ open: true, index: itemIndex })}
                accessibilityRole="button"
                accessibilityLabel={t("m.common.preview")}
              >
                <Image source={{ uri: item.uri }} style={styles.mediaThumb} contentFit="cover" />
              </Pressable>
              {item.type === "VIDEO" ? (
                <View style={styles.videoBadge} pointerEvents="none">
                  <Ionicons name="videocam" size={12} color="#fff" />
                </View>
              ) : null}
              {(item.priceKrw ?? 0) > 0 ? (
                <View style={styles.priceBadge} pointerEvents="none">
                  <Text style={styles.priceBadgeText}>{formatSaleMoco(item.priceKrw ?? 0)}</Text>
                </View>
              ) : null}
              <Pressable
                style={styles.mediaRemove}
                onPress={() => setMedia((prev) => prev.filter((m) => m.id !== item.id))}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t("m.compose.remove_attachment")}
              >
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      {poll ? (
        <PollEditor
          value={poll}
          onChange={setPoll}
          onRemove={() => setPoll(null)}
          disabled={busy}
          colors={colors}
          durationOptions={pollDurationOptions}
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
        <View style={styles.toolbarLeading}>
          <ToolIcon name="image-outline" onPress={() => void pickGallery()} disabled={busy} color={colors.terracotta} />
          {!isQuoteCompose ? (
            <Pressable
              onPress={() => {
                if (isNsfw) {
                  showIslandError(t("m.common.error"), t("m.compose.attach_nsfw"));
                  return;
                }
                setAttachPicked([]);
                setAttachOpen(true);
              }}
              disabled={busy}
              hitSlop={8}
              style={{ opacity: busy ? 0.45 : 1 }}
              accessibilityRole="button"
              accessibilityLabel={t("m.compose.attach")}
            >
              <Text style={styles.attachBtnText}>{t("m.compose.attach")}</Text>
            </Pressable>
          ) : null}
          {!isQuoteCompose ? (
            <>
              <ToolIcon
                name="stats-chart-outline"
                onPress={togglePoll}
                disabled={busy}
                color={poll ? colors.brand : colors.terracotta}
              />
              <View ref={collabAnchorRef} collapsable={false}>
                <ToolIcon
                  name="people-outline"
                  onPress={() => {
                    collabAnchorRef.current?.measureInWindow((x, y, width, height) => {
                      setCollabAnchor({ x, y, width, height });
                      setCollabOpen(true);
                    });
                  }}
                  disabled={busy}
                  color={collaborators.length ? colors.brand : colors.terracotta}
                />
              </View>
              <NsfwToggleButton
                active={isNsfw}
                onToggle={() => {
                  if (!isNsfw && media.some((m) => (m.priceKrw ?? 0) > 0)) {
                    showIslandError(t("m.common.error"), t("m.compose.attach_nsfw"));
                    return;
                  }
                  setIsNsfw((v) => !v);
                }}
                disabled={busy}
              />
            </>
          ) : null}
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
        anchor={collabAnchor}
        selected={collaborators}
        onClose={() => {
          setCollabOpen(false);
          setCollabAnchor(null);
        }}
        onChange={setCollaborators}
      />

      {watermarkMod ? (
        <WatermarkJobHosts
          mod={watermarkMod}
          captureJob={captureJob}
          overlayJob={overlayJob}
          textOverlayJob={textOverlayJob}
          onCaptureDone={() => setCaptureJob(null)}
          onOverlayDone={() => setOverlayJob(null)}
          onTextDone={() => setTextOverlayJob(null)}
        />
      ) : null}

      <FeedImageLightbox
        visible={mediaLightbox.open}
        images={composeLightboxImages}
        initialIndex={mediaLightbox.index}
        onClose={() => setMediaLightbox((prev) => ({ ...prev, open: false }))}
      />

      <ComposeAttachModal
        visible={attachOpen}
        colors={colors}
        busy={busy}
        pickedLabel={
          attachPicked.length > 0
            ? t("m.compose.attach_picked", { count: String(attachPicked.length) })
            : null
        }
        onClose={() => {
          setAttachOpen(false);
          setAttachPicked([]);
        }}
        onPick={() => void pickAttachMedia()}
        onConfirm={confirmAttach}
      />
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
  durationOptions,
}: {
  value: PollDraft;
  onChange: (p: PollDraft) => void;
  onRemove: () => void;
  disabled?: boolean;
  colors: ThemeColors;
  durationOptions: ReturnType<typeof getPollDurationOptions>;
}) {
  const { t } = useI18n();
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
        <Text style={{ fontWeight: "800", color: colors.text, fontSize: 14 }}>{t("m.common.poll")}</Text>
        <Pressable onPress={onRemove} hitSlop={8} disabled={disabled}>
          <Text style={{ color: colors.textMuted, fontWeight: "700" }}>{t("m.common.remove")}</Text>
        </Pressable>
      </View>
      <Text style={{ color: colors.textMuted, fontSize: 11 }}>
        {t("m.compose.post_body_becomes_the_question_2")}
      </Text>
      {value.options.map((opt, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TextInput
            value={opt}
            editable={!disabled}
            maxLength={50}
            placeholder={t("m.compose.option_v", { v: String(i + 1) })}
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
          <Text style={{ color: colors.terracotta, fontWeight: "800" }}>{t("m.compose.add_option")}</Text>
        </Pressable>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {durationOptions.map((d) => {
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

const COLLAB_POPUP_WIDTH = 300;

function CollaboratorModal({
  visible,
  anchor,
  selected,
  onClose,
  onChange,
}: {
  visible: boolean;
  anchor: MenuAnchor | null;
  selected: CollaboratorDraft[];
  onClose: () => void;
  onChange: (next: CollaboratorDraft[]) => void;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const popupStyles = useMemo(() => createCollabPopupStyles(colors), [colors]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const keyboardBottom = useKeyboardBottomInset();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CollaboratorDraft[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) return;
    setQ("");
    setResults([]);
  }, [visible]);

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
            res.users.map((t) => ({
              id: t.id,
              username: t.username,
              name: t.name,
              image: t.image,
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

  const popupWidth = Math.min(COLLAB_POPUP_WIDTH, windowWidth - spacing.sm * 2);
  const popupTop = anchor ? anchor.y + anchor.height + 6 : 0;
  const popupLeft = anchor
    ? Math.max(
        spacing.sm,
        Math.min(
          anchor.x + anchor.width / 2 - popupWidth / 2,
          windowWidth - popupWidth - spacing.sm
        )
      )
    : spacing.sm;
  const popupMaxHeight = anchor
    ? Math.max(160, windowHeight - popupTop - keyboardBottom - spacing.md)
    : 280;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={popupStyles.root}>
        <Pressable style={popupStyles.scrim} onPress={onClose} accessibilityRole="button" />
        {anchor ? (
          <View
            style={[
              popupStyles.panel,
              {
                top: popupTop,
                left: popupLeft,
                width: popupWidth,
                maxHeight: popupMaxHeight,
              },
            ]}
          >
            <View style={popupStyles.header}>
              <Text style={popupStyles.title}>{t("m.compose.co_creators")}</Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={popupStyles.done}>{t("common.done")}</Text>
              </Pressable>
            </View>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder={t("compose.collabSearch")}
              placeholderTextColor={colors.textMuted}
              autoFocus
              style={popupStyles.input}
            />
            {searching ? (
              <ActivityIndicator color={colors.terracotta} style={{ marginVertical: 8 }} />
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: popupMaxHeight - 100 }}>
              {results.map((person) => {
                const picked = selectedIds.has(person.id);
                return (
                  <Pressable
                    key={person.id}
                    style={[popupStyles.row, picked && { opacity: 0.55 }]}
                    onPress={() => {
                      if (picked) {
                        onChange(selected.filter((s) => s.id !== person.id));
                        return;
                      }
                      if (selected.length >= 5) {
                        showIslandError(t("m.compose.limit"), t("compose.collabMax"));
                        return;
                      }
                      onChange([...selected, person]);
                    }}
                  >
                    {person.image ? (
                      <Image source={{ uri: person.image }} style={popupStyles.avatar} />
                    ) : (
                      <View style={popupStyles.avatarFallback}>
                        <Text style={popupStyles.avatarLetter}>
                          {(person.name || person.username).slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={popupStyles.name}>{person.name || person.username}</Text>
                      <Text style={popupStyles.username}>@{person.username}</Text>
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
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

function createCollabPopupStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1 },
    scrim: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    panel: {
      position: "absolute",
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: spacing.md,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    title: { fontSize: 16, fontWeight: "800", color: colors.text },
    done: { color: colors.terracotta, fontWeight: "700" },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.background,
      marginBottom: 8,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 10,
    },
    avatar: { width: 36, height: 36, borderRadius: 10 },
    avatarFallback: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarLetter: { color: "#fff", fontWeight: "800" },
    name: { fontWeight: "800", color: colors.text },
    username: { color: colors.textMuted },
  });
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
    avatarHit: { alignSelf: "flex-start" },
    avatarHitPressed: { opacity: 0.82 },
    inputColumn: { flex: 1, minWidth: 0 },
    inputHit: { flex: 1, paddingTop: 8 },
    quoteChip: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginTop: 4,
    },
    quoteChipTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
    quoteChipBody: { marginTop: 2, fontSize: 13, color: colors.textMuted },
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
    mediaThumbHit: { width: "100%", height: "100%" },
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
    priceBadge: {
      position: "absolute",
      left: 4,
      top: 4,
      maxWidth: 78,
      backgroundColor: "rgba(0,0,0,0.62)",
      borderRadius: 8,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    priceBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
    attachBtnText: { color: colors.brand, fontSize: 14, fontWeight: "800" },
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
    toolbar: {
      marginTop: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    toolbarLeading: { flex: 1, flexDirection: "row", gap: 14, alignItems: "center" },
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
