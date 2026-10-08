import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiError } from "@/api/client";
import {
  createAnimeWork,
  updateAnimeWork,
  type AnimeCreatePayload,
  type AnimeDetailItem,
} from "@/api/discovery";
import { uploadLocalFile } from "@/api/upload-file";
import {
  MOBILE_ANIME_GENRES,
  genreLabel,
  type MobileAnimeGenreId,
} from "@/features/anime/anime-genres";
import { useI18n } from "@/i18n/I18nProvider";
import { animeUi } from "@/features/anime/anime-ui";
import { WikiContent } from "@/features/anime/WikiContent";
import { WikiInfoboxField } from "@/features/anime/WikiInfoboxField";
import { extractYoutubeId } from "@/features/anime/wiki-youtube";
import { characterNames } from "@/features/anime/wiki-article";
import { cultureWikiEnglishOnlyViolation } from "@/lib/culture-wiki-english-only";
import { useKeyboardLift } from "@/lib/use-keyboard-inset";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

type Props = {
  mode: "create" | "edit";
  slug?: string;
  presetGenre?: string;
  initial?: AnimeDetailItem;
};

async function pickAndUploadImage(aspect?: [number, number], permDeniedMsg?: string) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(permDeniedMsg ?? "Photo library access is required.");
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.92,
    allowsEditing: Boolean(aspect),
    aspect,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  const mime = asset.mimeType ?? "image/jpeg";
  const ext = mime.includes("png") ? "png" : "jpg";
  const url = await uploadLocalFile({
    uri: asset.uri,
    filename: `wiki-${Date.now()}.${ext}`,
    contentType: mime,
    category: "image",
  });
  return { uri: asset.uri, url };
}

export function AnimeWikiForm({ mode, slug, presetGenre, initial }: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => animeUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { keyboardLift } = useKeyboardLift();
  const queryClient = useQueryClient();

  const initialGenre: MobileAnimeGenreId =
    (initial?.genre as MobileAnimeGenreId | undefined) &&
    MOBILE_ANIME_GENRES.some((g) => g.id === initial?.genre)
      ? (initial!.genre as MobileAnimeGenreId)
      : presetGenre && MOBILE_ANIME_GENRES.some((g) => g.id === presetGenre)
        ? (presetGenre as MobileAnimeGenreId)
        : "OTHER";

  const [title, setTitle] = useState(initial?.title ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [genre, setGenre] = useState<MobileAnimeGenreId>(initialGenre);
  const [studio, setStudio] = useState(initial?.studio ?? "");
  const [synopsis, setSynopsis] = useState(initial?.synopsis ?? "");
  const [worldInfo, setWorldInfo] = useState(initial?.worldInfo ?? "");
  const [infobox, setInfobox] = useState(initial?.infobox ?? "");
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [charactersText, setCharactersText] = useState(characterNames(initial?.characters).join("\n"));
  const [editSummary, setEditSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.coverUrl ?? null);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial?.bannerUrl ?? null);
  const [localBannerUri, setLocalBannerUri] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: AnimeCreatePayload) =>
      mode === "edit" && slug ? updateAnimeWork(slug, body) : createAnimeWork(body),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-anime"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-anime-detail", res.anime.slug] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-anime-history", res.anime.slug] });
      showIslandSuccess(
        mode === "edit" ? copy.saveDoneTitle : copy.saveCreateDoneTitle,
        copy.saveDoneMsg
      );
      navigation.replace("AnimeDetail", { slug: res.anime.slug });
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : copy.saveFailDefault;
      showIslandError(copy.saveFailTitle, msg);
    },
  });

  async function pickCover() {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage([2, 3], copy.photoLibPerm);
      if (!picked) return;
      setLocalCoverUri(picked.uri);
      setCoverUrl(picked.url);
    } catch (e) {
      showIslandError(copy.saveFailTitle, e instanceof Error ? e.message : copy.coverFail);
    } finally {
      setUploading(false);
    }
  }

  async function pickBanner() {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage([3, 1], copy.photoLibPerm);
      if (!picked) return;
      setLocalBannerUri(picked.uri);
      setBannerUrl(picked.url);
    } catch (e) {
      showIslandError(copy.saveFailTitle, e instanceof Error ? e.message : copy.bannerFail);
    } finally {
      setUploading(false);
    }
  }

  async function insertBodyImage() {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage(undefined, copy.photoLibPerm);
      if (!picked) return;
      setSynopsis((v) => `${v.trim() ? `${v.trim()}\n\n` : ""}![${copy.photoCaption}](${picked.url})\n\n`);
    } catch (e) {
      showIslandError(copy.saveFailTitle, e instanceof Error ? e.message : copy.photoFail);
    } finally {
      setUploading(false);
    }
  }

  function insertVideoLink() {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      showIslandError(copy.inputCheckTitle, copy.videoLinkRequired);
      return;
    }
    if (!extractYoutubeId(trimmed)) {
      showIslandError(copy.inputCheckTitle, copy.youtubeRequired);
      return;
    }
    setSynopsis((v) => `${v.trim() ? `${v.trim()}\n\n` : ""}${trimmed}\n\n`);
    setVideoUrl("");
  }

  function onSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      showIslandError(copy.inputCheckTitle, copy.titleRequired);
      return;
    }
    const englishOnlyCode = cultureWikiEnglishOnlyViolation([
      trimmed,
      titleEn,
      studio,
      synopsis,
      worldInfo,
      infobox,
      tags,
      charactersText,
    ]);
    if (englishOnlyCode) {
      showIslandError(copy.inputCheckTitle, t(englishOnlyCode));
      return;
    }
    mutation.mutate({
      title: trimmed,
      titleEn: titleEn.trim() || undefined,
      genre,
      studio: studio.trim() || undefined,
      synopsis: synopsis.trim() || undefined,
      worldInfo: worldInfo.trim() || undefined,
      infobox: infobox.trim() || undefined,
      tags: tags.trim() || undefined,
      charactersText: charactersText.trim() || undefined,
      coverUrl: coverUrl || undefined,
      bannerUrl: bannerUrl || undefined,
      editSummary: mode === "edit" ? editSummary.trim() || undefined : undefined,
    });
  }

  const busy = mutation.isPending || uploading;

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title={mode === "edit" ? copy.formEditTitle : copy.formCreateTitle}
        onLeftPress={() => navigation.goBack()}
        leftLabel={copy.back}
      />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom:
              insets.bottom + 24 + (Platform.OS === "android" ? keyboardLift : 0),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
        automaticallyAdjustsScrollIndicatorInsets={Platform.OS === "ios"}
      >
          <Text style={styles.lead}>{copy.formIntro}</Text>
          <Text style={styles.englishOnlyNotice}>{copy.englishOnlyNotice}</Text>

          <Label text={copy.titleLabel} colors={colors} />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={copy.titlePh}
            placeholderTextColor={colors.textMuted}
            maxLength={200}
          />

          <Label text={copy.titleEnLabel} colors={colors} />
          <TextInput
            style={styles.input}
            value={titleEn}
            onChangeText={setTitleEn}
            placeholder={copy.titleEnPh}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <Label text={copy.genreLabel} colors={colors} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.genreScroll}>
            <View style={styles.genreRow}>
              {MOBILE_ANIME_GENRES.map((g) => {
                const active = genre === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => setGenre(g.id)}
                    style={[styles.genreChip, active && styles.genreChipActive]}
                  >
                    <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>
                      {genreLabel(g.id)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Label text={copy.coverLabel} colors={colors} />
          <Pressable
            onPress={() => void pickCover()}
            disabled={busy}
            style={styles.coverPick}
            accessibilityRole="button"
            accessibilityLabel={copy.coverUploadA11y}
          >
            {localCoverUri || coverUrl ? (
              <Image
                source={{ uri: localCoverUri ?? coverUrl! }}
                style={styles.coverPreview}
                contentFit="cover"
              />
            ) : (
              <View style={styles.coverEmpty}>
                <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                <Text style={styles.coverEmptyText}>{copy.coverUpload}</Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.coverBusy}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>

          <Label text={copy.bannerLabel} colors={colors} />
          <Pressable
            onPress={() => void pickBanner()}
            disabled={busy}
            style={styles.bannerPick}
            accessibilityRole="button"
            accessibilityLabel={copy.bannerUploadA11y}
          >
            {localBannerUri || bannerUrl ? (
              <Image
                source={{ uri: localBannerUri ?? bannerUrl! }}
                style={styles.bannerPreview}
                contentFit="cover"
              />
            ) : (
              <View style={styles.bannerEmpty}>
                <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                <Text style={styles.coverEmptyText}>{copy.bannerUpload}</Text>
              </View>
            )}
          </Pressable>

          <Label text={copy.studioLabel} colors={colors} />
          <TextInput
            style={styles.input}
            value={studio}
            onChangeText={setStudio}
            placeholder={copy.studioPh}
            placeholderTextColor={colors.textMuted}
          />

          <WikiInfoboxField
            label={copy.infoboxLabel}
            value={infobox}
            onChange={setInfobox}
            placeholder={copy.infoboxPh}
          />

          <Label text={copy.synopsisLabel} colors={colors} />
          <View style={styles.toolbar}>
            <Pressable onPress={() => void insertBodyImage()} disabled={busy} style={styles.toolBtn}>
              <Ionicons name="image-outline" size={16} color={colors.brand} />
              <Text style={styles.toolBtnText}>{copy.photoUploadBtn}</Text>
            </Pressable>
          </View>
          <View style={styles.videoRow}>
            <TextInput
              style={[styles.input, styles.videoInput]}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder={copy.videoPh}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={insertVideoLink} style={styles.toolBtn}>
              <Ionicons name="link-outline" size={16} color={colors.brand} />
              <Text style={styles.toolBtnText}>{copy.insertBtn}</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={synopsis}
            onChangeText={setSynopsis}
            placeholder={copy.synopsisPh}
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled
            nestedScrollEnabled
            textAlignVertical="top"
            autoCorrect={false}
            spellCheck={false}
            blurOnSubmit={false}
          />
          {synopsis.trim() ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>{copy.preview}</Text>
              <WikiContent source={synopsis} />
            </View>
          ) : null}

          <Label text={copy.worldLabel} colors={colors} />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={worldInfo}
            onChangeText={setWorldInfo}
            placeholder={copy.worldPh}
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled
            nestedScrollEnabled
            textAlignVertical="top"
            autoCorrect={false}
            spellCheck={false}
            blurOnSubmit={false}
          />

          <Label text={copy.castLabel} colors={colors} />
          <TextInput
            style={[styles.input, styles.textAreaSm]}
            value={charactersText}
            onChangeText={setCharactersText}
            placeholder={copy.castPh}
            placeholderTextColor={colors.textMuted}
            multiline
            scrollEnabled
            nestedScrollEnabled
            textAlignVertical="top"
            autoCorrect={false}
            spellCheck={false}
            blurOnSubmit={false}
          />

          <Label text={copy.tagsLabel} colors={colors} />
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder={copy.tagsPh}
            placeholderTextColor={colors.textMuted}
          />

          {mode === "edit" ? (
            <>
              <Label text={copy.summaryLabel} colors={colors} />
              <TextInput
                style={styles.input}
                value={editSummary}
                onChangeText={setEditSummary}
                placeholder={copy.summaryPh}
                placeholderTextColor={colors.textMuted}
              />
            </>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text style={styles.noticeText}>{copy.licenseNote}</Text>
          </View>

          <FolkButton
            label={mutation.isPending ? copy.saving : mode === "edit" ? copy.saveEdit : copy.saveCreate}
            onPress={onSubmit}
            disabled={busy}
          />
      </ScrollView>
    </Screen>
  );
}

function Label({ text, colors }: { text: string; colors: ThemeColors }) {
  return <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text, marginTop: spacing.md }}>{text}</Text>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.xs,
    },
    lead: {
      fontSize: 13,
      lineHeight: 19,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    englishOnlyNotice: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.terracotta,
      marginBottom: spacing.sm,
    },
    input: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 15,
    },
    textArea: {
      minHeight: 120,
      maxHeight: 200,
      paddingTop: 10,
    },
    textAreaSm: {
      minHeight: 88,
      maxHeight: 140,
      paddingTop: 10,
    },
    genreScroll: {
      marginTop: 6,
      maxHeight: 44,
    },
    genreRow: {
      flexDirection: "row",
      gap: 8,
      paddingRight: spacing.lg,
    },
    genreChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    genreChipActive: {
      borderColor: colors.brand,
      backgroundColor: colors.muted,
    },
    genreChipText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.textMuted,
    },
    genreChipTextActive: {
      color: colors.brand,
    },
    coverPick: {
      marginTop: 6,
      width: 132,
      aspectRatio: 2 / 3,
      borderRadius: radii.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    coverPreview: {
      width: "100%",
      height: "100%",
    },
    coverEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: 8,
    },
    coverEmptyText: {
      fontSize: 11,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
    },
    coverBusy: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
    },
    bannerPick: {
      marginTop: 6,
      width: "100%",
      aspectRatio: 3,
      borderRadius: radii.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    bannerPreview: {
      width: "100%",
      height: "100%",
    },
    bannerEmpty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      flexDirection: "row",
    },
    toolbar: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    toolBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    toolBtnText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.brand,
    },
    videoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    videoInput: {
      flex: 1,
      marginTop: 0,
    },
    preview: {
      marginTop: 8,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    previewLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: colors.textMuted,
      marginBottom: 8,
    },
    notice: {
      flexDirection: "row",
      gap: 8,
      marginTop: spacing.lg,
      marginBottom: spacing.sm,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    noticeText: {
      flex: 1,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
    },
  });
}
