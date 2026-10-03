import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploadLocalFile } from "@/api/upload-file";
import { patchProfile } from "@/api/profile";
import { patchMe } from "@/api/discovery";
import { prepareProfileAvatar } from "@/lib/prepare-profile-media";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { SignupCompleteCelebration } from "@/features/auth/SignupCompleteCelebration";
import { detectDeviceTimeZone } from "@/lib/device-timezone";
import { filterSettingCountries, settingCountryLabel } from "@/lib/setting-countries";
import { localeForCountry } from "@/i18n/locale-from-country";
import { useI18n } from "@/i18n/I18nProvider";

export type SignupOnboardingBirth = {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
};

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

type Props = {
  visible: boolean;
  /** When true, birth/avatar are patched after account already exists. */
  mode: "postAuth" | "collectOnly";
  confirmedBirth: SignupOnboardingBirth | null;
  onClose: () => void;
  /** Called after celebration (postAuth) or when collectOnly finishes picking. */
  onFinished: (payload: {
    birth: SignupOnboardingBirth;
    imageUrl: string | null;
    localAvatarUri: string | null;
    username: string;
    name: string;
    password: string;
  }) => void;
};

type Step = "locale" | "identity" | "password" | "avatar" | "done";

/**
 * Mobile signup tail: country/TZ → username/nickname → password → gallery avatar.
 */
export function SignupOnboardingSheet({
  visible,
  mode,
  confirmedBirth,
  onClose,
  onFinished,
}: Props) {
  const { colors } = useTheme();
  const { locale, t } = useI18n();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("locale");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [timeZone, setTimeZone] = useState(() => detectDeviceTimeZone());
  const [countryQuery, setCountryQuery] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep("locale");
      setBusy(false);
      setError("");
      setCountryCode("US");
      setTimeZone(detectDeviceTimeZone());
      setCountryQuery("");
      setUsername("");
      setDisplayName("");
      setPassword("");
      setPasswordConfirm("");
      setLocalUri(null);
      setImageUrl(null);
    }
  }, [visible]);

  const birthOk = confirmedBirth !== null;
  const usernameOk = USERNAME_RE.test(username.trim().toLowerCase());
  const identityOk = usernameOk && displayName.trim().length >= 1;
  const passwordOk = password.length >= 8 && password === passwordConfirm;

  const pickAvatar = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showIslandError(t("m.common.permission_required"), t("m.common.photo_library_access_is_required"));
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (picked.canceled || !picked.assets[0]) return;
    setLocalUri(picked.assets[0].uri);
    setError("");
  }, []);

  async function saveLocaleAndContinue() {
    setBusy(true);
    setError("");
    try {
      if (mode === "postAuth") {
        await patchMe({
          countryCode,
          locale: localeForCountry(countryCode),
          timeZone: detectDeviceTimeZone(),
        });
      }
      setStep("identity");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("m.auth.could_not_save_country_and_time"));
    } finally {
      setBusy(false);
    }
  }

  async function submitAvatar() {
    if (!localUri) {
      setError(t("m.auth.please_choose_a_profile_photo"));
      return;
    }
    if (!birthOk || !confirmedBirth) {
      setError(t("m.auth.please_check_your_date_of_birth"));
      onClose();
      return;
    }
    if (!identityOk || !passwordOk) {
      setError(t("m.auth.please_check_username_display_name_and"));
      setStep("identity");
      return;
    }

    const birth = confirmedBirth;
    const usernameNorm = username.trim().toLowerCase();

    if (mode === "collectOnly") {
      onFinished({
        birth,
        imageUrl: null,
        localAvatarUri: localUri,
        username: usernameNorm,
        name: displayName.trim(),
        password,
      });
      return;
    }

    setBusy(true);
    setError("");
    try {
      const prepared = await prepareProfileAvatar(localUri);
      const url = await uploadLocalFile({
        uri: prepared,
        filename: `profile-avatar-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        category: "image",
      });
      await patchProfile({
        image: url,
        birthYear: birth.birthYear,
        birthMonth: birth.birthMonth,
        birthDay: birth.birthDay,
      });
      await patchMe({ countryCode, timeZone: detectDeviceTimeZone() });
      setImageUrl(url);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("m.auth.could_not_save_profile"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Modal
        visible={visible && step !== "done"}
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
              },
            ]}
          >
            <View style={[styles.grabber, { backgroundColor: colors.border }]} />

            {step === "locale" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t("auth.country")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  {t("m.auth.search_and_pick_a_country_time")}
                </Text>
                <TextInput
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                  placeholder={t("m.auth.search_country_name")}
                  placeholderTextColor={colors.textMuted}
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={[
                    styles.search,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                />
                <ScrollView style={{ maxHeight: 220, marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                  {filterSettingCountries(countryQuery, locale).map((code) => {
                    const active = countryCode === code;
                    return (
                      <Pressable
                        key={code}
                        onPress={() => setCountryCode(code)}
                        style={[
                          styles.countryRow,
                          {
                            backgroundColor: active ? `${colors.brand}22` : "transparent",
                          },
                        ]}
                      >
                        <Text style={{ color: colors.text, fontWeight: active ? "800" : "600", fontSize: 14 }}>
                          {active ? ">> " : ""}
                          {settingCountryLabel(code, locale)}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{code}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  {t("auth.timeZone")} · {timeZone}
                </Text>
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <Pressable
                  style={[styles.primary, { backgroundColor: busy ? colors.muted : colors.brand }]}
                  disabled={busy}
                  onPress={() => void saveLocaleAndContinue()}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>{t("common.next")}</Text>
                  )}
                </Pressable>
              </>
            ) : step === "identity" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t("m.auth.username_display_name")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  {t("m.auth.choose_the_username_and_display_name")}
                </Text>
                <Field
                  label={t("m.common.username")}
                  value={username}
                  onChangeText={(v) =>
                    setUsername(v.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))
                  }
                  placeholder="mocomo_user"
                  maxLength={20}
                  colors={colors}
                  autoCapitalize="none"
                />
                <Field
                  label={t("m.common.display_name")}
                  value={displayName}
                  onChangeText={(v) => setDisplayName(v.slice(0, 40))}
                  placeholder={t("m.common.display_name")}
                  maxLength={40}
                  colors={colors}
                />
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <Pressable
                  style={[styles.primary, { backgroundColor: identityOk ? colors.brand : colors.muted }]}
                  disabled={!identityOk || busy}
                  onPress={() => {
                    setError("");
                    setStep("password");
                  }}
                >
                  <Text style={styles.primaryText}>{t("common.next")}</Text>
                </Pressable>
              </>
            ) : step === "password" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t("auth.passwordSimple")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  {t("m.auth.create_a_password_for_id_login")}
                </Text>
                <Field
                  label={t("auth.passwordSimple")}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  maxLength={128}
                  colors={colors}
                  secure
                />
                <Field
                  label={t("m.auth.confirm_password")}
                  value={passwordConfirm}
                  onChangeText={setPasswordConfirm}
                  placeholder="••••••••"
                  maxLength={128}
                  colors={colors}
                  secure
                />
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <Pressable
                  style={[styles.primary, { backgroundColor: passwordOk ? colors.brand : colors.muted }]}
                  disabled={!passwordOk || busy}
                  onPress={() => {
                    setError("");
                    setStep("avatar");
                  }}
                >
                  <Text style={styles.primaryText}>{t("common.next")}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>{t("m.common.profile_photo")}</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  {t("m.auth.pick_one_photo_from_your_gallery")}
                </Text>

                <Pressable style={styles.avatarPick} onPress={() => void pickAvatar()} disabled={busy}>
                  {localUri ? (
                    <Image source={{ uri: localUri }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarEmpty, { borderColor: colors.border }]}>
                      <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontWeight: "700", marginTop: 8 }}>
                        {t("m.auth.choose_from_gallery")}
                      </Text>
                    </View>
                  )}
                </Pressable>

                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

                <Pressable
                  style={[
                    styles.primary,
                    { backgroundColor: localUri && !busy ? colors.brand : colors.muted },
                  ]}
                  disabled={!localUri || busy}
                  onPress={() => void submitAvatar()}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>{t("common.next")}</Text>
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <SignupCompleteCelebration
        visible={visible && step === "done"}
        onDone={() =>
          onFinished({
            birth: confirmedBirth ?? {
              birthYear: 2000,
              birthMonth: 1,
              birthDay: 1,
            },
            imageUrl,
            localAvatarUri: localUri,
            username: username.trim().toLowerCase(),
            name: displayName.trim(),
            password,
          })
        }
      />
    </>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  colors,
  secure,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  colors: { text: string; textMuted: string; border: string; surfaceRaised: string };
  secure?: boolean;
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={{ flex: 1, marginBottom: 10 }}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={secure ? "default" : "default"}
        secureTextEntry={secure}
        autoCapitalize={autoCapitalize ?? "sentences"}
        maxLength={maxLength}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.surfaceRaised,
          },
        ]}
      />
    </View>
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
  sub: { fontSize: 14, marginTop: 6, marginBottom: 18, lineHeight: 20 },
  birthRow: { flexDirection: "row", gap: 10, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 8,
  },
  countryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  tzWrap: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  roleTitle: { fontSize: 15, fontWeight: "800" },
  roleSub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  avatarPick: { alignItems: "center", marginBottom: 16 },
  avatarImg: { width: 132, height: 132, borderRadius: 28 },
  avatarEmpty: {
    width: 132,
    height: 132,
    borderRadius: 28,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  error: { fontWeight: "700", textAlign: "center", marginBottom: 10 },
  primary: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    marginTop: spacing.sm,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
