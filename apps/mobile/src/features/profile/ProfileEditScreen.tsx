import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchProfileEditState, patchProfile } from "@/api/profile";
import { ApiError } from "@/api/client";
import { uploadLocalFile } from "@/api/upload-file";
import { useAuth } from "@/auth/AuthContext";
import { probeVideo } from "@/lib/apply-video-watermark";
import { transcodeBannerVideoToH264 } from "@/lib/transcode-banner-video";
import {
  isRemoteMediaUrl,
  prepareProfileAvatar,
  prepareProfileBannerImage,
} from "@/lib/prepare-profile-media";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandToast } from "@/ui/IslandToast";
import { useKeyboardBottomInset } from "@/lib/use-keyboard-inset";
import { useScrollFieldAboveKeyboard } from "@/lib/use-scroll-field-above-keyboard";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function birthDigitsOnly(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (
    err instanceof ApiError &&
    err.body &&
    typeof err.body === "object" &&
    "error" in err.body &&
    typeof (err.body as { error: unknown }).error === "string"
  ) {
    return (err.body as { error: string }).error;
  }
  return fallback;
}

export function ProfileEditScreen() {
  const { u, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { refreshMe, user: authUser } = useAuth();

  const query = useQuery({
    queryKey: ["mobile-profile-edit"],
    queryFn: fetchProfileEditState,
  });

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerVideoUrl, setBannerVideoUrl] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [mainCharacter, setMainCharacter] = useState("");
  const [favoriteTags, setFavoriteTags] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [showBirthdayOnProfile, setShowBirthdayOnProfile] = useState(false);
  const [showNsfw, setShowNsfw] = useState(false);
  const [usernameChangesRemaining, setUsernameChangesRemaining] = useState(2);
  const [initialUsername, setInitialUsername] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "banner" | "video" | null>(null);

  const keyboardInset = useKeyboardBottomInset();
  const { scrollRef, frameRef, keyboardLift, onScrollOffset, onInputFocus } =
    useScrollFieldAboveKeyboard();
  const nameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const bioRef = useRef<TextInput>(null);
  const birthYearRef = useRef<TextInput>(null);
  const birthMonthRef = useRef<TextInput>(null);
  const birthDayRef = useRef<TextInput>(null);
  const locationRef = useRef<TextInput>(null);
  const websiteRef = useRef<TextInput>(null);
  const mainCharacterRef = useRef<TextInput>(null);
  const favoriteTagsRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!query.data || hydrated) return;
    const d = query.data;
    const s = d.settings;
    setName(d.name ?? "");
    setUsername(d.username);
    setInitialUsername(d.username);
    setBio(d.bio ?? "");
    setImage(d.image);
    setBannerUrl(d.bannerUrl);
    setBannerVideoUrl(d.bannerVideoUrl);
    setLocation(s?.location ?? "");
    setWebsite(s?.website ?? "");
    setMainCharacter(s?.mainCharacter ?? "");
    setFavoriteTags(s?.favoriteTags ?? "");
    setBirthYear(s?.birthYear ?? "");
    setBirthMonth(s?.birthMonth ?? "");
    setBirthDay(s?.birthDay ?? "");
    setShowBirthdayOnProfile(s?.showBirthdayOnProfile ?? false);
    setShowNsfw(s?.showNsfw ?? false);
    setUsernameChangesRemaining(s?.usernameChangesRemaining ?? 2);
    setHydrated(true);
  }, [query.data, hydrated]);

  const publishMedia = useCallback(
    async (patch: { image?: string | null; bannerUrl?: string | null; bannerVideoUrl?: string | null }) => {
      await patchProfile(patch);
      await refreshMe();
      await queryClient.invalidateQueries({ queryKey: ["mobile-profile-edit"] });
      if (authUser?.username) {
        await queryClient.invalidateQueries({ queryKey: ["mobile-user", authUser.username] });
      }
      await queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
    },
    [authUser?.username, queryClient, refreshMe]
  );

  const saveMut = useMutation({
    mutationFn: async () => {
      const usernameNorm = username.trim().toLowerCase();
      const usernameChanged = usernameNorm !== initialUsername.toLowerCase();
      if (usernameChanged && !USERNAME_RE.test(usernameNorm)) {
        throw new Error(u("아이디는 영문·숫자·_ 3~20자입니다.", "Username must be 3–20 letters, numbers, or _."));
      }

      const y = birthYear.trim();
      const m = birthMonth.trim();
      const d = birthDay.trim();
      const clearBirth = !y && !m && !d;
      const partial = (y || m || d) && !(y && m && d);
      if (partial) {
        throw new Error(u("생년월일은 연·월·일을 모두 입력하거나, 모두 비워 주세요.", "Enter full birth date or leave all fields empty."));
      }

      const tags = favoriteTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await patchProfile({
        name: name.trim() || undefined,
        bio,
        ...(image === null || image === ""
          ? { image: null }
          : isRemoteMediaUrl(image)
            ? { image }
            : {}),
        bannerUrl: bannerVideoUrl ? null : isRemoteMediaUrl(bannerUrl) ? bannerUrl : undefined,
        bannerVideoUrl: bannerVideoUrl
          ? isRemoteMediaUrl(bannerVideoUrl)
            ? bannerVideoUrl
            : undefined
          : null,
        ...(usernameChanged ? { username: usernameNorm } : {}),
        mainCharacter,
        favoriteTags: tags,
        location,
        website,
        showNsfw,
        showBirthdayOnProfile,
        ...(clearBirth
          ? { clearBirthDate: true }
          : y && m && d
            ? {
                birthYear: Number(y),
                birthMonth: Number(m),
                birthDay: Number(d),
              }
            : {}),
      });
    },
    onSuccess: async () => {
      await refreshMe();
      await queryClient.invalidateQueries({ queryKey: ["mobile-profile-edit"] });
      if (authUser?.username) {
        await queryClient.invalidateQueries({ queryKey: ["mobile-user", authUser.username] });
      }
      showIslandToast("Saved", u("프로필이 업데이트되었습니다.", "Profile updated."));
      // Let the island pill paint before popping the screen.
      setTimeout(() => {
        if (navigation.canGoBack()) navigation.goBack();
      }, 320);
    },
    onError: (e) => {
      showIslandError(u("오류", "Error"), apiErrorMessage(e, e instanceof Error ? e.message : u("저장에 실패했습니다.", "Could not save.")));
    },
  });

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(u("권한 필요", "Permission needed"), u("사진 라이브러리 접근 권한이 필요합니다.", "Photo library access is required."));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      allowsEditing: false,
      exif: false,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const localUri = picked.assets[0].uri;
    // Optimistic preview — feel instant while upload runs in background.
    setImage(localUri);
    setUploading("avatar");
    try {
      const prepared = await prepareProfileAvatar(localUri);
      const url = await uploadLocalFile({
        uri: prepared,
        filename: `profile-avatar-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        category: "image",
      });
      setImage(url);
      await publishMedia({ image: url });
      showIslandToast("Saved", u("프로필 사진을 올렸습니다.", "Profile photo uploaded."));
    } catch (e) {
      setImage(image);
      showIslandError(u("오류", "Error"), apiErrorMessage(e, u("프로필 사진 업로드에 실패했습니다.", "Could not upload profile photo.")));
    } finally {
      setUploading(null);
    }
  }, [image, publishMedia]);

  const pickBannerImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(u("권한 필요", "Permission needed"), u("사진 라이브러리 접근 권한이 필요합니다.", "Photo library access is required."));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.75,
      exif: false,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const localUri = picked.assets[0].uri;
    setBannerUrl(localUri);
    setBannerVideoUrl(null);
    setUploading("banner");
    try {
      const prepared = await prepareProfileBannerImage(localUri);
      const url = await uploadLocalFile({
        uri: prepared,
        filename: `profile-banner-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        category: "image",
      });
      setBannerUrl(url);
      setBannerVideoUrl(null);
      await publishMedia({ bannerUrl: url, bannerVideoUrl: null });
      showIslandToast("Saved", u("배너를 올렸습니다.", "Banner uploaded."));
    } catch (e) {
      showIslandError(u("오류", "Error"), apiErrorMessage(e, u("배너 업로드에 실패했습니다.", "Could not upload banner.")));
    } finally {
      setUploading(null);
    }
  }, [publishMedia]);

  const pickBannerVideo = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(u("권한 필요", "Permission needed"), u("사진 라이브러리 접근 권한이 필요합니다.", "Photo library access is required."));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading("video");
    try {
      const asset = picked.assets[0];
      const probe = await probeVideo(asset.uri);
      if (probe.durationSec > 10.5) {
        showIslandError(u("동영상 길이", "Video length"), u("배너 동영상은 10초 이하여야 합니다.", "Banner video must be 10 seconds or less."));
        return;
      }
      const converted = await transcodeBannerVideoToH264(asset.uri);
      const url = await uploadLocalFile({
        uri: converted.uri,
        filename: converted.filename,
        contentType: converted.mime,
        category: "video",
      });
      setBannerVideoUrl(url);
      setBannerUrl(null);
      await publishMedia({ bannerUrl: null, bannerVideoUrl: url });
      showIslandToast("Saved", u("배너 동영상을 올렸습니다.", "Banner video uploaded."));
    } catch (e) {
      showIslandError(u("오류", "Error"), apiErrorMessage(e, u("배너 동영상 업로드에 실패했습니다.", "Could not upload banner video.")));
    } finally {
      setUploading(null);
    }
  }, [publishMedia]);

  const usernameLocked = usernameChangesRemaining <= 0;

  if (query.isLoading) {
    return (
      <Screen>
        <AppHeader title={u("프로필 수정", "Edit profile")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <AppHeader title={u("프로필 수정", "Edit profile")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{u("프로필 정보를 불러오지 못했습니다.", "Could not load profile.")}</Text>
          <FolkButton label={t("toast.retry")} onPress={() => void query.refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title={u("프로필 수정", "Edit profile")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View ref={frameRef} style={{ flex: 1, marginBottom: keyboardLift }}>
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={[
              styles.body,
              { paddingBottom: insets.bottom + spacing.md + keyboardLift },
            ]}
            keyboardShouldPersistTaps="handled"
            onScroll={(e) => onScrollOffset(e.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
          >
          <FolkCard style={styles.previewCard}>
            <View style={styles.previewBanner}>
              <ProfileBannerMedia
                bannerUrl={bannerUrl}
                bannerVideoUrl={bannerVideoUrl}
                active
              />
            </View>
            <View style={styles.previewRow}>
              <FolkAvatar uri={image} name={name || username} size={56} />
              <View style={styles.previewMeta}>
                <Text style={styles.previewName} numberOfLines={1}>
                  {name || username}
                </Text>
                <Text style={styles.previewHint}>{u("미리보기", "Preview")}</Text>
              </View>
            </View>
          </FolkCard>

          <FolkCard>
            <Text style={styles.sectionTitle}>{u("배너 (사진 또는 동영상)", "Banner (photo or video)")}</Text>
            <Text style={styles.sectionDesc}>{u("동영상은 최대 10초까지 자동 재생됩니다.", "Videos autoplay for up to 10 seconds.")}</Text>
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.brand }]}
                onPress={() => void pickBannerImage()}
                disabled={uploading !== null}
              >
                <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                  {uploading === "banner" ? u("업로드 중…", "Uploading…") : u("사진 올리기", "Upload photo")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.brand }]}
                onPress={() => void pickBannerVideo()}
                disabled={uploading !== null}
              >
                <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                  {uploading === "video" ? u("업로드 중…", "Uploading…") : u("동영상 올리기", "Upload video")}
                </Text>
              </Pressable>
            </View>
            {(bannerUrl || bannerVideoUrl) ? (
              <Pressable
                onPress={() => {
                  setBannerUrl(null);
                  setBannerVideoUrl(null);
                }}
              >
                <Text style={styles.linkDanger}>{u("배너 제거", "Remove banner")}</Text>
              </Pressable>
            ) : null}
          </FolkCard>

          <FolkCard>
            <Text style={styles.sectionTitle}>{u("프로필 사진", "Profile photo")}</Text>
            <View style={styles.avatarRow}>
              <FolkAvatar uri={image} name={name || username} size={72} />
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.brand, flex: 1 }]}
                onPress={() => void pickAvatar()}
                disabled={uploading !== null}
              >
                <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                  {uploading === "avatar" ? u("업로드 중…", "Uploading…") : u("사진 올리기", "Upload photo")}
                </Text>
              </Pressable>
            </View>
          </FolkCard>

          <FolkCard>
            <Text style={styles.label}>{u("표시 이름", "Display name")}</Text>
            <TextInput
              ref={nameRef}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={u("닉네임", "Display name")}
              placeholderTextColor={colors.textMuted}
              onFocus={() => onInputFocus(nameRef.current)}
            />

            <Text style={styles.label}>{u("아이디", "Username")}</Text>
            <View style={styles.atRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                ref={usernameRef}
                style={[styles.input, styles.atInput, styles.atField, usernameLocked && styles.inputDisabled]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!usernameLocked}
                placeholder="myid"
                placeholderTextColor={colors.textMuted}
                onFocus={() => onInputFocus(usernameRef.current)}
              />
            </View>
            <Text style={styles.hint}>
              {usernameLocked
                ? u("14일 내 변경 횟수를 모두 사용했습니다.", "You used all username changes for this period.")
                : u(`영문·숫자·_ 3~20자 · 남은 변경 ${usernameChangesRemaining}회`, `Letters, numbers, _ · ${usernameChangesRemaining} changes left`)}
            </Text>

            <Text style={styles.label}>{u("소개", "Bio")}</Text>
            <TextInput
              ref={bioRef}
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={160}
              placeholder={u("자기소개 (160자)", "Bio (160 chars)")}
              placeholderTextColor={colors.textMuted}
              onFocus={() => onInputFocus(bioRef.current)}
            />

            <Text style={styles.label}>{u("생일", "Birthday")}</Text>
            <View style={styles.birthRow}>
              <TextInput
                ref={birthYearRef}
                style={[styles.input, styles.birthInput]}
                value={birthYear}
                onChangeText={(t) => setBirthYear(birthDigitsOnly(t, 4))}
                keyboardType="number-pad"
                placeholder={u("연", "Year")}
                placeholderTextColor={colors.textMuted}
                onFocus={() => onInputFocus(birthYearRef.current)}
              />
              <TextInput
                ref={birthMonthRef}
                style={[styles.input, styles.birthInput]}
                value={birthMonth}
                onChangeText={(t) => setBirthMonth(birthDigitsOnly(t, 2))}
                keyboardType="number-pad"
                placeholder={u("월", "Month")}
                placeholderTextColor={colors.textMuted}
                onFocus={() => onInputFocus(birthMonthRef.current)}
              />
              <TextInput
                ref={birthDayRef}
                style={[styles.input, styles.birthInput]}
                value={birthDay}
                onChangeText={(t) => setBirthDay(birthDigitsOnly(t, 2))}
                keyboardType="number-pad"
                placeholder={u("일", "Day")}
                placeholderTextColor={colors.textMuted}
                onFocus={() => onInputFocus(birthDayRef.current)}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{u("프로필에 생일 표시 (월/일)", "Show birthday on profile (month/day)")}</Text>
              <Switch
                value={showBirthdayOnProfile}
                onValueChange={setShowBirthdayOnProfile}
                trackColor={{ true: colors.terracotta, false: colors.muted }}
              />
            </View>

            <Text style={styles.label}>{u("위치", "Location")}</Text>
            <TextInput
              ref={locationRef}
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder={u("서울, 대한민국", "City, country")}
              placeholderTextColor={colors.textMuted}
              onFocus={() => onInputFocus(locationRef.current)}
            />

            <Text style={styles.label}>{u("웹사이트", "Website")}</Text>
            <TextInput
              ref={websiteRef}
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              placeholder="https://"
              placeholderTextColor={colors.textMuted}
              onFocus={() => onInputFocus(websiteRef.current)}
            />

            <Text style={styles.label}>{u("대표 캐릭터", "Main character")}</Text>
            <TextInput
              ref={mainCharacterRef}
              style={styles.input}
              value={mainCharacter}
              onChangeText={setMainCharacter}
              placeholder=""
              placeholderTextColor={colors.textMuted}
              onFocus={() => onInputFocus(mainCharacterRef.current)}
            />

            <Text style={styles.label}>{u("좋아하는 작품 (쉼표 구분)", "Favorite works (comma-separated)")}</Text>
            <TextInput
              ref={favoriteTagsRef}
              style={styles.input}
              value={favoriteTags}
              onChangeText={setFavoriteTags}
              placeholder={u("작품1, 작품2", "work1, work2")}
              placeholderTextColor={colors.textMuted}
              onFocus={() => onInputFocus(favoriteTagsRef.current)}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{u("NSFW 콘텐츠 표시", "Show NSFW content")}</Text>
              <Switch
                value={showNsfw}
                onValueChange={setShowNsfw}
                trackColor={{ true: colors.terracotta, false: colors.muted }}
              />
            </View>
          </FolkCard>
          </ScrollView>
        </View>

        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              marginBottom: Platform.OS === "android" ? keyboardInset : 0,
            },
          ]}
        >
          <FolkButton
            label={u("저장", "Save")}
            loading={saveMut.isPending}
            onPress={() => saveMut.mutate()}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, gap: spacing.md },
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
    errorText: { color: colors.danger, fontWeight: "700" },
    previewCard: { overflow: "hidden", padding: 0 },
    previewBanner: { height: 96, backgroundColor: colors.muted },
    previewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: spacing.md,
      marginTop: -24,
    },
    previewMeta: { flex: 1 },
    previewName: { fontSize: 18, fontWeight: "800", color: colors.text },
    previewHint: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    sectionDesc: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
    btnRow: { flexDirection: "row", gap: 8 },
    outlineBtn: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingVertical: 10,
      alignItems: "center",
    },
    outlineBtnText: { fontWeight: "800", fontSize: 13 },
    linkDanger: { color: colors.danger, fontWeight: "700", marginTop: 10, fontSize: 13 },
    avatarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    label: { fontWeight: "800", color: colors.cobalt, marginTop: spacing.sm, marginBottom: 6 },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
    },
    inputDisabled: { opacity: 0.55 },
    atRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      paddingLeft: spacing.sm,
      overflow: "hidden",
    },
    atPrefix: { fontWeight: "800", color: colors.textMuted, fontSize: 16 },
    atInput: { flex: 1 },
    atField: {
      borderWidth: 0,
      backgroundColor: "transparent",
      paddingLeft: 4,
    },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 16 },
    bioInput: { minHeight: 88, textAlignVertical: "top" },
    birthRow: { flexDirection: "row", gap: 8 },
    birthInput: { flex: 1, textAlign: "center" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.md,
      gap: 12,
    },
    switchLabel: { flex: 1, color: colors.text, fontWeight: "600", fontSize: 14 },
    footer: {
      paddingHorizontal: spacing.md,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
  });
}
