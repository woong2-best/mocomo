import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { removeFollowingDmUser, upsertFollowingDmUser } from "@/api/following-dm-cache";
import {
  applyAsCosplayerMobile,
  fetchOnboardingCosplayers,
  type OnboardingCosplayer,
} from "@/api/onboarding";
import { toggleFollowUser } from "@/api/social";
import { uploadLocalFile } from "@/api/upload-file";
import { prepareProfileBannerImage } from "@/lib/prepare-profile-media";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

export type SignupRole = "fan" | "coser";

type Props = {
  visible: boolean;
  role: SignupRole | null;
  onFinished: () => void;
  onClose: () => void;
};

const BIO_MAX = 300;

/**
 * After account exists: fan → follow popular cosers; coser → inline Culture Wiki register.
 */
export function SignupRoleFollowUpSheet({ visible, role, onFinished, onClose }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<OnboardingCosplayer[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setBusy(false);
      setError("");
      setItems([]);
      setBio("");
      setLocalUri(null);
      setFollowBusyId(null);
      return;
    }
    if (role !== "fan") return;
    let cancelled = false;
    setLoadingList(true);
    void (async () => {
      try {
        const res = await fetchOnboardingCosplayers(24);
        if (!cancelled) setItems(res.items ?? []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("m.auth.could_not_load_cosplayers"));
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, role]);

  const pickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.common.permission_required"), t("m.common.photo_library_access_is_required"));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [3, 4],
    });
    if (picked.canceled || !picked.assets[0]) return;
    setLocalUri(picked.assets[0].uri);
    setError("");
  }, [t]);

  async function onFollow(userId: string) {
    setFollowBusyId(userId);
    setError("");
    try {
      const res = await toggleFollowUser(userId);
      if (res.error) {
        setError(res.error);
        return;
      }
      const following = !!res.following || !!res.pending;
      setItems((prev) =>
        prev.map((c) => (c.userId === userId ? { ...c, following } : c))
      );
      const person = items.find((c) => c.userId === userId);
      if (res.following && person) {
        void upsertFollowingDmUser(queryClient, {
          id: person.userId,
          username: person.username,
          name: person.displayName,
          image: person.image,
        });
      } else if (!res.following) {
        void removeFollowingDmUser(queryClient, userId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("m.auth.could_not_follow"));
    } finally {
      setFollowBusyId(null);
    }
  }

  async function submitCoser() {
    if (!localUri) {
      setError(t("m.auth.please_choose_a_profile_photo"));
      return;
    }
    if (!bio.trim()) {
      setError(t("m.auth.please_enter_a_bio"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const prepared = await prepareProfileBannerImage(localUri);
      const photoUrl = await uploadLocalFile({
        uri: prepared,
        filename: `coser-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        category: "image",
      });
      const res = await applyAsCosplayerMobile({ bio: bio.trim(), photoUrl });
      if (res.error) {
        setError(res.error);
        return;
      }
      onFinished();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("m.auth.cosplayer_registration_failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!role) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.scrim}
          onPress={() => {
            if (!busy) onClose();
          }}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.hairline,
              paddingBottom: insets.bottom + 14,
              maxHeight: "88%",
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          {role === "fan" ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("m.auth.follow_cosplayers")}
              </Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {t("m.auth.follow_cosplayers_you_like_to_see")}
              </Text>

              {loadingList ? (
                <ActivityIndicator color={colors.brand} style={{ marginVertical: 24 }} />
              ) : (
                <FlatList
                  data={items}
                  keyExtractor={(item) => item.userId}
                  style={{ maxHeight: 360 }}
                  ListEmptyComponent={
                    <Text style={[styles.empty, { color: colors.textMuted }]}>
                      {t("m.auth.no_cosplayers_listed_yet_you_can")}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <View style={[styles.row, { borderColor: colors.hairline }]}>
                      <Image
                        source={
                          item.photoUrl || item.image
                            ? { uri: (item.photoUrl || item.image)! }
                            : undefined
                        }
                        style={styles.avatar}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                          {item.displayName}
                        </Text>
                        <Text style={[styles.handle, { color: colors.textMuted }]} numberOfLines={1}>
                          @{item.username}
                        </Text>
                      </View>
                      <Pressable
                        style={[
                          styles.followBtn,
                          {
                            backgroundColor: item.following ? colors.muted : colors.brand,
                          },
                        ]}
                        disabled={item.following || followBusyId === item.userId}
                        onPress={() => void onFollow(item.userId)}
                      >
                        {followBusyId === item.userId ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <Text style={styles.followText}>
                            {item.following ? t("m.common.following") : t("m.common.follow")}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                />
              )}

              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

              <Pressable
                style={[styles.primary, { backgroundColor: colors.brand }]}
                disabled={busy}
                onPress={onFinished}
              >
                <Text style={styles.primaryText}>{t("m.common.next")}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                {t("m.auth.register_as_cosplayer")}
              </Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {t("m.auth.add_a_photo_and_bio_to")}
              </Text>

              <Pressable style={styles.photoPick} onPress={() => void pickPhoto()} disabled={busy}>
                {localUri ? (
                  <Image source={{ uri: localUri }} style={styles.photoImg} contentFit="cover" />
                ) : (
                  <View style={[styles.photoEmpty, { borderColor: colors.border }]}>
                    <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                    <Text style={{ color: colors.textMuted, fontWeight: "700", marginTop: 8 }}>
                      {t("m.auth.choose_photo")}
                    </Text>
                  </View>
                )}
              </Pressable>

              <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                {t("m.common.bio")} ({bio.length}/{BIO_MAX})
              </Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder={t("m.auth.cosplay_style_favorite_series_event_sche")}
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={BIO_MAX}
                style={[
                  styles.bioInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surfaceRaised,
                  },
                ]}
              />

              {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

              <Pressable
                style={[
                  styles.primary,
                  {
                    backgroundColor:
                      localUri && bio.trim() && !busy ? colors.brand : colors.muted,
                  },
                ]}
                disabled={!localUri || !bio.trim() || busy}
                onPress={() => void submitCoser()}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryText}>{t("m.auth.register_and_finish")}</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.skip}
                disabled={busy}
                onPress={onFinished}
              >
                <Text style={[styles.skipText, { color: colors.textMuted }]}>
                  {t("m.auth.skip_and_finish")}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(9,16,30,0.55)" },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3 },
  sub: { fontSize: 14, marginTop: 6, marginBottom: 14, lineHeight: 20 },
  empty: { textAlign: "center", paddingVertical: 28, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#ddd" },
  name: { fontSize: 14, fontWeight: "800" },
  handle: { fontSize: 12, marginTop: 2 },
  followBtn: {
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 72,
    alignItems: "center",
  },
  followText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  photoPick: { alignItems: "center", marginBottom: 14 },
  photoImg: { width: 160, height: 200, borderRadius: 18 },
  photoEmpty: {
    width: 160,
    height: 200,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  bioInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 96,
    textAlignVertical: "top",
    fontWeight: "600",
  },
  error: { fontWeight: "700", textAlign: "center", marginVertical: 10 },
  primary: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: spacing.sm,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  skip: { alignItems: "center", paddingVertical: 12 },
  skipText: { fontSize: 13, fontWeight: "700" },
});
