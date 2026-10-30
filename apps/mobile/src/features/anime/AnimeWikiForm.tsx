import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
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
import { WikiInfobox } from "@/features/anime/WikiInfobox";
import { WikiInfoboxEditor } from "@/features/anime/WikiInfoboxEditor";
import { applyYoutubePaste } from "@/features/anime/wiki-youtube";
import { insertWikiTemplate, WIKI_MORE_INSERTS } from "@/features/anime/wiki-insert";
import { useKeyboardLift } from "@/lib/use-keyboard-inset";
import { characterNames } from "@/features/anime/wiki-article";
import {
  DEFAULT_WIKI_BODY,
  DEFAULT_WIKI_DOCUMENT,
  composeWikiDocument,
  splitWikiDocument,
} from "@/features/anime/wiki-document";
import { DEFAULT_WIKI_INFOBOX, mergeStudioIntoInfobox } from "@/features/anime/wiki-infobox";
import { cultureWikiEnglishOnlyViolation } from "@/lib/culture-wiki-english-only";
import { KeyboardAwareScrollView, KeyboardAwareTextInput } from "@/ui/KeyboardAwareScrollView";
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
  presetTitle?: string;
  initial?: AnimeDetailItem;
};

async function pickAndUploadImage(aspect?: [number, number], permDeniedMsg?: string) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error(permDeniedMsg ?? "Photo library access is required.");
  }
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: Boolean(aspect),
    aspect,
    preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const asset = picked.assets[0];
  const mime = asset.mimeType ?? "image/jpeg";
  const ext = mime.includes("png")
    ? "png"
    : mime.includes("webp")
      ? "webp"
      : mime.includes("gif")
        ? "gif"
        : mime.includes("heic")
          ? "heic"
          : mime.includes("heif")
            ? "heif"
            : "jpg";
  const url = await uploadLocalFile({
    uri: asset.uri,
    filename: `wiki-${Date.now()}.${ext}`,
    contentType: mime,
    category: "image",
  });
  return { uri: asset.uri, url };
}

export function AnimeWikiForm({ mode, slug, presetGenre, presetTitle, initial }: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => animeUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { keyboardLift } = useKeyboardLift();
  const queryClient = useQueryClient();
  const bodyInputRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const initialGenre: MobileAnimeGenreId =
    (initial?.genre as MobileAnimeGenreId | undefined) &&
    MOBILE_ANIME_GENRES.some((g) => g.id === initial?.genre)
      ? (initial!.genre as MobileAnimeGenreId)
      : presetGenre && MOBILE_ANIME_GENRES.some((g) => g.id === presetGenre)
        ? (presetGenre as MobileAnimeGenreId)
        : "OTHER";

  const [title, setTitle] = useState(initial?.title ?? presetTitle ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [genre, setGenre] = useState<MobileAnimeGenreId>(initialGenre);
  const initialDoc = useMemo(
    () =>
      mode === "create"
        ? DEFAULT_WIKI_DOCUMENT
        : composeWikiDocument({
            synopsis: initial?.synopsis,
            worldInfo: initial?.worldInfo,
            infobox: initial?.infobox,
            charactersText: characterNames(initial?.characters).join("\n"),
          }),
    [initial?.characters, initial?.infobox, initial?.synopsis, initial?.worldInfo, mode]
  );
  const [body, setBody] = useState(() => splitWikiDocument(initialDoc).body || DEFAULT_WIKI_BODY);
  const [infobox, setInfobox] = useState(() =>
    mergeStudioIntoInfobox(
      splitWikiDocument(initialDoc).infobox || initial?.infobox || DEFAULT_WIKI_INFOBOX,
      initial?.studio
    )
  );
  const document = useMemo(
    () => composeWikiDocument({ synopsis: body, infobox }),
    [body, infobox]
  );
  const [tags, setTags] = useState(initial?.tags?.join(", ") ?? "");
  const [editSummary, setEditSummary] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(initial?.coverUrl ?? null);
  const [localCoverUri, setLocalCoverUri] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(initial?.bannerUrl ?? null);
  const [localBannerUri, setLocalBannerUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pane, setPane] = useState<"edit" | "preview">("edit");
  const [moreOpen, setMoreOpen] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

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
      setBody((v) => `${v.trim() ? `${v.trim()}\n\n` : ""}![${copy.photoCaption}](${picked.url})\n\n`);
    } catch (e) {
      showIslandError(copy.saveFailTitle, e instanceof Error ? e.message : copy.photoFail);
    } finally {
      setUploading(false);
    }
  }

  function insertTemplate(template: string) {
    const { start, end } = selectionRef.current;
    const result = insertWikiTemplate(body, start, end, template);
    setBody(result.next);
    selectionRef.current = { start: result.caret, end: result.caret };
    requestAnimationFrame(() => {
      bodyInputRef.current?.focus();
      bodyInputRef.current?.setNativeProps?.({
        selection: { start: result.caret, end: result.caret },
      });
    });
  }

  function onSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      showIslandError(copy.inputCheckTitle, copy.titleRequired);
      return;
    }
    const split = splitWikiDocument(document);
    const englishOnlyCode = cultureWikiEnglishOnlyViolation([
      trimmed,
      titleEn,
      split.studio,
      split.body,
      split.infobox,
      tags,
      split.charactersText,
    ]);
    if (englishOnlyCode) {
      showIslandError(copy.inputCheckTitle, t(englishOnlyCode));
      return;
    }
    mutation.mutate({
      title: trimmed,
      titleEn: titleEn.trim() || undefined,
      genre,
      studio: split.studio,
      synopsis: split.body.trim() || undefined,
      worldInfo: undefined,
      infobox: split.infobox,
      tags: tags.trim() || undefined,
      charactersText: split.charactersText,
      coverUrl: coverUrl || undefined,
      bannerUrl: bannerUrl || undefined,
      editSummary: mode === "edit" ? editSummary.trim() || undefined : undefined,
    });
  }

  const busy = mutation.isPending || uploading;
  const dockToolbar = pane === "edit" && bodyFocused && keyboardLift > 0;

  function renderArticleToolbar(docked: boolean) {
    return (
      <View style={[styles.iconToolbar, docked && styles.iconToolbarDocked]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.iconToolbarRow}
        >
          <Pressable
            onPress={() => void insertBodyImage()}
            disabled={busy}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={copy.photoUploadBtn}
          >
            <Ionicons name="image-outline" size={22} color={colors.brand} />
          </Pressable>
          <Pressable
            onPress={() => insertTemplate("**|**")}
            disabled={busy}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={copy.boldBtn}
          >
            <Ionicons name="text" size={22} color={colors.brand} />
          </Pressable>
          <Pressable
            onPress={() => insertTemplate("[[|]]")}
            disabled={busy}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={copy.wikilinkBtn}
          >
            <Ionicons name="link-outline" size={22} color={colors.brand} />
          </Pressable>
          <Pressable
            onPress={() => insertTemplate("\n== | ==\n")}
            disabled={busy}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={copy.headingBtn}
          >
            <Ionicons name="text-outline" size={22} color={colors.brand} />
          </Pressable>
          <View style={styles.iconDivider} />
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setMoreOpen(true);
            }}
            disabled={busy}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={copy.moreBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.brand} />
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <Screen style={styles.screen}>
      <AppHeader
        title={mode === "edit" ? copy.formEditTitle : copy.formCreateTitle}
        onLeftPress={() => navigation.goBack()}
        leftLabel={copy.back}
      />
      <KeyboardAwareScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + 24,
          },
        ]}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
          <Text style={styles.lead}>{copy.metaHelp}</Text>
          <Text style={styles.englishOnlyNotice}>{copy.englishOnlyNotice}</Text>

          <Label text={copy.titleLabel} colors={colors} />
          <KeyboardAwareTextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={copy.titlePh}
            placeholderTextColor={colors.textMuted}
            maxLength={200}
          />

          <Label text={copy.titleEnLabel} colors={colors} />
          <KeyboardAwareTextInput
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

          <Label text={copy.infoboxLabel} colors={colors} />
          <Text style={styles.help}>{copy.infoboxHelp}</Text>
          <WikiInfoboxEditor value={infobox} onChange={setInfobox} />
          <Text style={styles.previewLabel}>{copy.infoboxCardPreview}</Text>
          <WikiInfobox
            title={title.trim() || copy.titlePh}
            titleEn={titleEn.trim() || null}
            photoUrl={localCoverUri ?? coverUrl}
            infobox={infobox}
            fallbackRows={
              genre ? [{ label: copy.infoboxCategory, value: genreLabel(genre) }] : []
            }
          />

          <Label text={copy.bodyLabel} colors={colors} />
          <Text style={styles.englishOnlyNotice}>{copy.bodyHelp}</Text>
          <Text style={styles.help}>{copy.youtubePasteHint}</Text>
          <View style={styles.articleCard}>
            <View style={styles.tabs} accessibilityRole="tablist">
              <Pressable
                onPress={() => setPane("edit")}
                style={[styles.tab, pane === "edit" && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: pane === "edit" }}
              >
                <Text style={[styles.tabText, pane === "edit" && styles.tabTextActive]}>{copy.editTab}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPane("preview");
                  setBodyFocused(false);
                  Keyboard.dismiss();
                }}
                style={[styles.tab, pane === "preview" && styles.tabActive]}
                accessibilityRole="tab"
                accessibilityState={{ selected: pane === "preview" }}
              >
                <Text style={[styles.tabText, pane === "preview" && styles.tabTextActive]}>{copy.preview}</Text>
              </Pressable>
            </View>
            {pane === "edit" && !dockToolbar ? renderArticleToolbar(false) : null}
            {pane === "preview" ? (
              <View style={styles.previewPane}>
                {body.trim() ? (
                  <WikiContent source={body} />
                ) : (
                  <Text style={styles.help}>{copy.previewEmpty}</Text>
                )}
              </View>
            ) : (
              <KeyboardAwareTextInput
                ref={bodyInputRef}
                style={[styles.input, styles.textAreaLg, styles.articleInput]}
                value={body}
                onChangeText={(next) => setBody(applyYoutubePaste(body, next))}
                onSelectionChange={(e) => {
                  selectionRef.current = e.nativeEvent.selection;
                }}
                onFocus={() => setBodyFocused(true)}
                onBlur={() => setBodyFocused(false)}
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
            )}
          </View>

          <Label text={copy.tagsLabel} colors={colors} />
          <KeyboardAwareTextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder={copy.tagsPh}
            placeholderTextColor={colors.textMuted}
          />

          {mode === "edit" ? (
            <>
              <Label text={copy.summaryLabel} colors={colors} />
              <KeyboardAwareTextInput
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
      </KeyboardAwareScrollView>
      {dockToolbar ? (
        <View style={[styles.dockedToolbarWrap, { bottom: keyboardLift }]} pointerEvents="box-none">
          {renderArticleToolbar(true)}
        </View>
      ) : null}
      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}>
        <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMoreOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{copy.moreTitle}</Text>
          <View style={styles.sheetGrid}>
            {WIKI_MORE_INSERTS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => {
                  insertTemplate(item.template);
                  setMoreOpen(false);
                }}
                style={styles.sheetItem}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={22} color={colors.brand} />
                <Text style={styles.sheetItemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        </View>
      </Modal>
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
    help: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
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
    textAreaLg: {
      minHeight: 280,
      maxHeight: 480,
      paddingTop: 10,
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
      fontSize: 14,
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
    articleCard: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      overflow: "hidden",
    },
    tabs: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.muted,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: 10,
    },
    tabActive: {
      backgroundColor: colors.surfaceRaised,
    },
    tabText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.textMuted,
    },
    tabTextActive: {
      color: colors.text,
    },
    iconToolbar: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    iconToolbarDocked: {
      borderBottomWidth: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    iconToolbarRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 6,
      paddingVertical: 4,
    },
    iconBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    iconDivider: {
      width: 1,
      height: 20,
      marginHorizontal: 4,
      backgroundColor: colors.border,
    },
    articleInput: {
      marginTop: 0,
      borderWidth: 0,
      borderRadius: 0,
    },
    previewPane: {
      minHeight: 280,
      padding: 12,
    },
    dockedToolbarWrap: {
      position: "absolute",
      left: 0,
      right: 0,
      zIndex: 20,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: 12,
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
      marginBottom: 12,
    },
    sheetGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    sheetItem: {
      width: "23%",
      minWidth: 72,
      flexGrow: 1,
      alignItems: "center",
      gap: 6,
      paddingVertical: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.muted,
    },
    sheetItemLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
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
