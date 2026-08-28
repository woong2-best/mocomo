import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  prepareProfileAvatar,
  prepareProfileBannerImage,
} from "@/lib/prepare-profile-media";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

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

  const saveMut = useMutation({
    mutationFn: async () => {
      const usernameNorm = username.trim().toLowerCase();
      const usernameChanged = usernameNorm !== initialUsername.toLowerCase();
      if (usernameChanged && !USERNAME_RE.test(usernameNorm)) {
        throw new Error("아이디는 영문·숫자·_ 3~20자입니다.");
      }

      const y = birthYear.trim();
      const m = birthMonth.trim();
      const d = birthDay.trim();
      const clearBirth = !y && !m && !d;
      const partial = (y || m || d) && !(y && m && d);
      if (partial) {
        throw new Error("생년월일은 연·월·일을 모두 입력하거나, 모두 비워 주세요.");
      }

      const tags = favoriteTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      await patchProfile({
        name: name.trim() || undefined,
        bio,
        image,
        bannerUrl: bannerVideoUrl ? null : bannerUrl,
        bannerVideoUrl,
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
      Alert.alert("저장됨", "프로필이 업데이트되었습니다.");
      if (navigation.canGoBack()) navigation.goBack();
    },
    onError: (e) => {
      Alert.alert("오류", apiErrorMessage(e, e instanceof Error ? e.message : "저장에 실패했습니다."));
    },
  });

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading("avatar");
    try {
      const prepared = await prepareProfileAvatar(picked.assets[0].uri);
      const url = await uploadLocalFile({
        uri: prepared,
        filename: `profile-avatar-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        category: "image",
      });
      setImage(url);
    } catch (e) {
      Alert.alert("오류", apiErrorMessage(e, "프로필 사진 업로드에 실패했습니다."));
    } finally {
      setUploading(null);
    }
  }, []);

  const pickBannerImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setUploading("banner");
    try {
      const prepared = await prepareProfileBannerImage(picked.assets[0].uri);
      const url = await uploadLocalFile({
        uri: prepared,
        filename: `profile-banner-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        category: "image",
      });
      setBannerUrl(url);
      setBannerVideoUrl(null);
    } catch (e) {
      Alert.alert("오류", apiErrorMessage(e, "배너 업로드에 실패했습니다."));
    } finally {
      setUploading(null);
    }
  }, []);

  const pickBannerVideo = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
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
        Alert.alert("동영상 길이", "배너 동영상은 10초 이하여야 합니다.");
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
    } catch (e) {
      Alert.alert("오류", apiErrorMessage(e, "배너 동영상 업로드에 실패했습니다."));
    } finally {
      setUploading(null);
    }
  }, []);

  const usernameLocked = usernameChangesRemaining <= 0;

  if (query.isLoading) {
    return (
      <Screen>
        <AppHeader title="프로필 수정" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      </Screen>
    );
  }

  if (query.isError) {
    return (
      <Screen>
        <AppHeader title="프로필 수정" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>프로필 정보를 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="프로필 수정" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 96 }]}
          keyboardShouldPersistTaps="handled"
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
                <Text style={styles.previewHint}>미리보기</Text>
              </View>
            </View>
          </FolkCard>

          <FolkCard>
            <Text style={styles.sectionTitle}>배너 (사진 또는 동영상)</Text>
            <Text style={styles.sectionDesc}>동영상은 최대 10초까지 자동 재생됩니다.</Text>
            <View style={styles.btnRow}>
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.brand }]}
                onPress={() => void pickBannerImage()}
                disabled={uploading !== null}
              >
                <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                  {uploading === "banner" ? "업로드 중…" : "사진 올리기"}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.brand }]}
                onPress={() => void pickBannerVideo()}
                disabled={uploading !== null}
              >
                <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                  {uploading === "video" ? "업로드 중…" : "동영상 올리기"}
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
                <Text style={styles.linkDanger}>배너 제거</Text>
              </Pressable>
            ) : null}
          </FolkCard>

          <FolkCard>
            <Text style={styles.sectionTitle}>프로필 사진</Text>
            <View style={styles.avatarRow}>
              <FolkAvatar uri={image} name={name || username} size={72} />
              <Pressable
                style={[styles.outlineBtn, { borderColor: colors.brand, flex: 1 }]}
                onPress={() => void pickAvatar()}
                disabled={uploading !== null}
              >
                <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                  {uploading === "avatar" ? "업로드 중…" : "사진 올리기"}
                </Text>
              </Pressable>
            </View>
          </FolkCard>

          <FolkCard>
            <Text style={styles.label}>표시 이름</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="닉네임"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>아이디</Text>
            <View style={styles.atRow}>
              <Text style={styles.atPrefix}>@</Text>
              <TextInput
                style={[styles.input, styles.atInput, usernameLocked && styles.inputDisabled]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!usernameLocked}
                placeholder="myid"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <Text style={styles.hint}>
              {usernameLocked
                ? "14일 내 변경 횟수를 모두 사용했습니다."
                : `영문·숫자·_ 3~20자 · 남은 변경 ${usernameChangesRemaining}회`}
            </Text>

            <Text style={styles.label}>소개</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={160}
              placeholder="자기소개 (160자)"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>생일</Text>
            <View style={styles.birthRow}>
              <TextInput
                style={[styles.input, styles.birthInput]}
                value={birthYear}
                onChangeText={setBirthYear}
                keyboardType="number-pad"
                placeholder="연"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.birthInput]}
                value={birthMonth}
                onChangeText={setBirthMonth}
                keyboardType="number-pad"
                placeholder="월"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                style={[styles.input, styles.birthInput]}
                value={birthDay}
                onChangeText={setBirthDay}
                keyboardType="number-pad"
                placeholder="일"
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>프로필에 생일 표시 (월/일)</Text>
              <Switch
                value={showBirthdayOnProfile}
                onValueChange={setShowBirthdayOnProfile}
                trackColor={{ true: colors.terracotta, false: colors.muted }}
              />
            </View>

            <Text style={styles.label}>위치</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="서울, 대한민국"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>웹사이트</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              autoCapitalize="none"
              placeholder="https://"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>대표 캐릭터</Text>
            <TextInput
              style={styles.input}
              value={mainCharacter}
              onChangeText={setMainCharacter}
              placeholder=""
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>좋아하는 작품 (쉼표 구분)</Text>
            <TextInput
              style={styles.input}
              value={favoriteTags}
              onChangeText={setFavoriteTags}
              placeholder="작품1, 작품2"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>NSFW 콘텐츠 표시</Text>
              <Switch
                value={showNsfw}
                onValueChange={setShowNsfw}
                trackColor={{ true: colors.terracotta, false: colors.muted }}
              />
            </View>
          </FolkCard>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <FolkButton
            label="저장"
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
    atRow: { flexDirection: "row", alignItems: "center" },
    atPrefix: { fontWeight: "800", color: colors.textMuted, marginRight: 4, fontSize: 16 },
    atInput: { flex: 1 },
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
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.md,
      paddingTop: 8,
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
  });
}
