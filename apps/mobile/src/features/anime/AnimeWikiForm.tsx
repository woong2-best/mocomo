import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
  type MobileAnimeGenreId,
} from "@/features/anime/anime-genres";
import { WikiContent } from "@/features/anime/WikiContent";
import { extractYoutubeId } from "@/features/anime/wiki-youtube";
import { characterNames } from "@/features/anime/wiki-article";
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

async function pickAndUploadImage(aspect?: [number, number]) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error("사진 라이브러리 접근 권한이 필요합니다.");
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const initialGenre: MobileAnimeGenreId =
    (initial?.genre as MobileAnimeGenreId | undefined) &&
    MOBILE_ANIME_GENRES.some((g) => g.id === initial?.genre)
      ? (initial.genre as MobileAnimeGenreId)
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
        mode === "edit" ? "수정 완료" : "등록 완료",
        "컬쳐 위키에 반영되었습니다."
      );
      navigation.replace("AnimeDetail", { slug: res.anime.slug });
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : "저장에 실패했습니다.";
      showIslandError("저장 실패", msg);
    },
  });

  async function pickCover() {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage([2, 3]);
      if (!picked) return;
      setLocalCoverUri(picked.uri);
      setCoverUrl(picked.url);
    } catch (e) {
      showIslandError("업로드 실패", e instanceof Error ? e.message : "표지를 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function pickBanner() {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage([3, 1]);
      if (!picked) return;
      setLocalBannerUri(picked.uri);
      setBannerUrl(picked.url);
    } catch (e) {
      showIslandError("업로드 실패", e instanceof Error ? e.message : "배너를 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function insertBodyImage() {
    setUploading(true);
    try {
      const picked = await pickAndUploadImage();
      if (!picked) return;
      setSynopsis((v) => `${v.trim() ? `${v.trim()}\n\n` : ""}![사진](${picked.url})\n\n`);
    } catch (e) {
      showIslandError("업로드 실패", e instanceof Error ? e.message : "사진을 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function insertVideoLink() {
    const trimmed = videoUrl.trim();
    if (!trimmed) {
      showIslandError("입력 확인", "영상 링크를 붙여넣어 주세요.");
      return;
    }
    if (!extractYoutubeId(trimmed)) {
      showIslandError("입력 확인", "유튜브 링크를 붙여넣어 주세요.");
      return;
    }
    setSynopsis((v) => `${v.trim() ? `${v.trim()}\n\n` : ""}${trimmed}\n\n`);
    setVideoUrl("");
  }

  function onSubmit() {
    const trimmed = title.trim();
    if (!trimmed) {
      showIslandError("입력 확인", "제목을 입력해 주세요.");
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
        title={mode === "edit" ? "문서 편집" : "작품 등록"}
        onLeftPress={() => navigation.goBack()}
        leftLabel="뒤로"
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 48}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.lead}>
            로그인한 누구나 작품 문서를 등록·수정할 수 있습니다. 저장하면 컬쳐 위키에 바로 반영됩니다.
          </Text>

          <Label text="제목 *" colors={colors} />
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="한글 제목"
            placeholderTextColor={colors.textMuted}
            maxLength={200}
          />

          <Label text="영문 제목" colors={colors} />
          <TextInput
            style={styles.input}
            value={titleEn}
            onChangeText={setTitleEn}
            placeholder="English title"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
          />

          <Label text="장르 *" colors={colors} />
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
                      {g.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Label text="표지 이미지" colors={colors} />
          <Pressable
            onPress={() => void pickCover()}
            disabled={busy}
            style={styles.coverPick}
            accessibilityRole="button"
            accessibilityLabel="표지 이미지 업로드"
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
                <Text style={styles.coverEmptyText}>사진 업로드</Text>
              </View>
            )}
            {uploading ? (
              <View style={styles.coverBusy}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </Pressable>

          <Label text="배너 이미지" colors={colors} />
          <Pressable
            onPress={() => void pickBanner()}
            disabled={busy}
            style={styles.bannerPick}
            accessibilityRole="button"
            accessibilityLabel="배너 이미지 업로드"
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
                <Text style={styles.coverEmptyText}>배너 사진 업로드</Text>
              </View>
            )}
          </Pressable>

          <Label text="제작사" colors={colors} />
          <TextInput
            style={styles.input}
            value={studio}
            onChangeText={setStudio}
            placeholder="스튜디오 · 제작사"
            placeholderTextColor={colors.textMuted}
          />

          <Label text="작품 정보표" colors={colors} />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={infobox}
            onChangeText={setInfobox}
            placeholder={"=== 작품 정보 ===\n장르 | 액션\n감독 | ..."}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <Label text="줄거리 / 설명" colors={colors} />
          <View style={styles.toolbar}>
            <Pressable onPress={() => void insertBodyImage()} disabled={busy} style={styles.toolBtn}>
              <Ionicons name="image-outline" size={16} color={colors.brand} />
              <Text style={styles.toolBtnText}>사진 업로드</Text>
            </Pressable>
          </View>
          <View style={styles.videoRow}>
            <TextInput
              style={[styles.input, styles.videoInput]}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="영상 링크 붙여넣기 (유튜브)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={insertVideoLink} style={styles.toolBtn}>
              <Ionicons name="link-outline" size={16} color={colors.brand} />
              <Text style={styles.toolBtnText}>넣기</Text>
            </Pressable>
          </View>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={synopsis}
            onChangeText={setSynopsis}
            placeholder="작품 소개. 사진은 업로드, 영상은 링크를 붙여넣으세요."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
          {synopsis.trim() ? (
            <View style={styles.preview}>
              <Text style={styles.previewLabel}>미리보기</Text>
              <WikiContent source={synopsis} />
            </View>
          ) : null}

          <Label text="세계관" colors={colors} />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={worldInfo}
            onChangeText={setWorldInfo}
            placeholder="세계관 · 설정"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <Label text="등장인물 (한 줄에 한 명)" colors={colors} />
          <TextInput
            style={[styles.input, styles.textAreaSm]}
            value={charactersText}
            onChangeText={setCharactersText}
            placeholder={"캐릭터 이름\n한 줄에 하나씩"}
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />

          <Label text="태그 (쉼표 구분)" colors={colors} />
          <TextInput
            style={styles.input}
            value={tags}
            onChangeText={setTags}
            placeholder="예: 2024, TV, 인기"
            placeholderTextColor={colors.textMuted}
          />

          {mode === "edit" ? (
            <>
              <Label text="수정 요약 (선택)" colors={colors} />
              <TextInput
                style={styles.input}
                value={editSummary}
                onChangeText={setEditSummary}
                placeholder="예: 줄거리 보강, 오타 수정"
                placeholderTextColor={colors.textMuted}
              />
            </>
          ) : null}

          <View style={styles.notice}>
            <Ionicons name="warning-outline" size={16} color="#D97706" />
            <Text style={styles.noticeText}>
              컬쳐 위키 글은 CC BY-NC-SA 4.0로 공유됩니다. 저작권·명예훼손에 유의해 주세요. 자세한
              내용은 설정의 이용 약관에서 확인할 수 있습니다.
            </Text>
          </View>

          <FolkButton
            label={mutation.isPending ? "저장 중…" : mode === "edit" ? "수정 저장" : "등록하기"}
            onPress={onSubmit}
            disabled={busy}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
      paddingTop: 10,
    },
    textAreaSm: {
      minHeight: 88,
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
      ...StyleSheet.absoluteFillObject,
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
