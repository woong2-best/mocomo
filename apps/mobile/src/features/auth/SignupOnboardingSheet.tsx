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
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("locale");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
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
      setCountryCode("KR");
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
      showIslandError("권한 필요", "사진 라이브러리 접근 권한이 필요합니다.");
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
        await patchMe({ countryCode, timeZone: detectDeviceTimeZone() });
      }
      setStep("identity");
    } catch (e) {
      setError(e instanceof Error ? e.message : "국가·시간대 저장에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAvatar() {
    if (!localUri) {
      setError("프로필 사진을 선택해 주세요.");
      return;
    }
    if (!birthOk || !confirmedBirth) {
      setError("생년월일을 확인해 주세요.");
      onClose();
      return;
    }
    if (!identityOk || !passwordOk) {
      setError("아이디·닉네임·비밀번호를 확인해 주세요.");
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
      setError(e instanceof Error ? e.message : "프로필 저장에 실패했습니다.");
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
                <Text style={[styles.title, { color: colors.text }]}>국가</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  국가를 검색해 선택하세요. 시간대는 이 스마트폰 시계를 따릅니다.
                </Text>
                <TextInput
                  value={countryQuery}
                  onChangeText={setCountryQuery}
                  placeholder="국가 이름 검색"
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
                  {filterSettingCountries(countryQuery, "ko").map((code) => {
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
                          {settingCountryLabel(code, "ko")}
                        </Text>
                        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{code}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                  시간대 · {timeZone}
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
                    <Text style={styles.primaryText}>다음</Text>
                  )}
                </Pressable>
              </>
            ) : step === "identity" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>아이디 · 닉네임</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  MoCoMo에서 쓸 아이디와 닉네임을 정해 주세요.
                </Text>
                <Field
                  label="아이디"
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
                  label="닉네임"
                  value={displayName}
                  onChangeText={(v) => setDisplayName(v.slice(0, 40))}
                  placeholder="표시 이름"
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
                  <Text style={styles.primaryText}>다음</Text>
                </Pressable>
              </>
            ) : step === "password" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>비밀번호</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  아이디 로그인에 사용할 비밀번호를 만드세요. (8자 이상)
                </Text>
                <Field
                  label="비밀번호"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  maxLength={128}
                  colors={colors}
                  secure
                />
                <Field
                  label="비밀번호 확인"
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
                  <Text style={styles.primaryText}>다음</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.title, { color: colors.text }]}>프로필 사진</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  갤러리에서 사진을 하나 골라 주세요. (배너는 나중에 설정할 수 있어요)
                </Text>

                <Pressable style={styles.avatarPick} onPress={() => void pickAvatar()} disabled={busy}>
                  {localUri ? (
                    <Image source={{ uri: localUri }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatarEmpty, { borderColor: colors.border }]}>
                      <Ionicons name="image-outline" size={28} color={colors.textMuted} />
                      <Text style={{ color: colors.textMuted, fontWeight: "700", marginTop: 8 }}>
                        갤러리에서 선택
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
                    <Text style={styles.primaryText}>다음</Text>
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
