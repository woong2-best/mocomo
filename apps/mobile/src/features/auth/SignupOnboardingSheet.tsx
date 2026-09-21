import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { uploadLocalFile } from "@/api/upload-file";
import { patchProfile } from "@/api/profile";
import { patchMe } from "@/api/discovery";
import { prepareProfileAvatar } from "@/lib/prepare-profile-media";
import type { SignupRole } from "@/features/auth/SignupRoleFollowUpSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing } from "@/theme/tokens";
import { SignupCompleteCelebration } from "@/features/auth/SignupCompleteCelebration";

export type SignupOnboardingBirth = {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
};

type Props = {
  visible: boolean;
  /** When true, birth/avatar are patched after account already exists. */
  mode: "postAuth" | "collectOnly";
  onClose: () => void;
  /** Called after celebration (postAuth) or when collectOnly finishes picking. */
  onFinished: (payload: {
    birth: SignupOnboardingBirth;
    imageUrl: string | null;
    localAvatarUri: string | null;
    role: SignupRole;
  }) => void;
};

type Step = "locale" | "birth" | "role" | "avatar" | "done";

const COUNTRIES = [
  { id: "KR", label: "대한민국" },
  { id: "US", label: "United States" },
  { id: "JP", label: "日本" },
  { id: "CN", label: "中国" },
  { id: "TW", label: "台灣" },
] as const;

const TIMEZONES = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "UTC",
] as const;

/**
 * Mobile signup tail: country/TZ → birth → role → gallery avatar → fireworks.
 */
export function SignupOnboardingSheet({
  visible,
  mode,
  onClose,
  onFinished,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("locale");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [timeZone, setTimeZone] = useState("Asia/Seoul");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [role, setRole] = useState<SignupRole | null>(null);
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep("locale");
      setBusy(false);
      setError("");
      setCountryCode("KR");
      setTimeZone("Asia/Seoul");
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      setRole(null);
      setLocalUri(null);
      setImageUrl(null);
    }
  }, [visible]);

  const birthOk =
    birthYear.trim().length === 4 &&
    Number(birthMonth) >= 1 &&
    Number(birthMonth) <= 12 &&
    Number(birthDay) >= 1 &&
    Number(birthDay) <= 31;

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
    setLocalUri(picked.assets[0].uri);
    setError("");
  }, []);

  async function saveLocaleAndContinue() {
    setBusy(true);
    setError("");
    try {
      if (mode === "postAuth") {
        await patchMe({ countryCode, timeZone });
      }
      setStep("birth");
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
    if (!birthOk) {
      setError("생년월일을 확인해 주세요.");
      setStep("birth");
      return;
    }
    if (!role) {
      setError("역할을 선택해 주세요.");
      setStep("role");
      return;
    }

    const birth: SignupOnboardingBirth = {
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
    };

    if (mode === "collectOnly") {
      onFinished({ birth, imageUrl: null, localAvatarUri: localUri, role });
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
      await patchMe({ countryCode, timeZone });
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
                <Text style={[styles.title, { color: colors.text }]}>국가 · 시간대</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  달력·방송 일정이 이 시간대 기준으로 표시됩니다. 나중에 설정에서 바꿀 수 있어요.
                </Text>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>국가</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 12 }}
                >
                  {COUNTRIES.map((c) => (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setCountryCode(c.id);
                        if (c.id === "KR") setTimeZone("Asia/Seoul");
                        if (c.id === "JP") setTimeZone("Asia/Tokyo");
                        if (c.id === "US") setTimeZone("America/Los_Angeles");
                      }}
                      style={[
                        styles.chip,
                        {
                          borderColor: countryCode === c.id ? colors.brand : colors.border,
                          backgroundColor:
                            countryCode === c.id ? `${colors.brand}22` : colors.surfaceRaised,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 13 }}>
                        {c.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>시간대</Text>
                <View style={styles.tzWrap}>
                  {TIMEZONES.map((tz) => (
                    <Pressable
                      key={tz}
                      onPress={() => setTimeZone(tz)}
                      style={[
                        styles.chip,
                        {
                          borderColor: timeZone === tz ? colors.brand : colors.border,
                          backgroundColor:
                            timeZone === tz ? `${colors.brand}22` : colors.surfaceRaised,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
                        {tz}
                      </Text>
                    </Pressable>
                  ))}
                </View>
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
            ) : step === "birth" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>생년월일</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  연령 확인을 위해 생년월일이 필요합니다.
                </Text>
                <View style={styles.birthRow}>
                  <Field
                    label="년"
                    value={birthYear}
                    onChangeText={setBirthYear}
                    placeholder="1990"
                    maxLength={4}
                    colors={colors}
                  />
                  <Field
                    label="월"
                    value={birthMonth}
                    onChangeText={setBirthMonth}
                    placeholder="1"
                    maxLength={2}
                    colors={colors}
                  />
                  <Field
                    label="일"
                    value={birthDay}
                    onChangeText={setBirthDay}
                    placeholder="1"
                    maxLength={2}
                    colors={colors}
                  />
                </View>
                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
                <Pressable
                  style={[styles.primary, { backgroundColor: birthOk ? colors.brand : colors.muted }]}
                  disabled={!birthOk || busy}
                  onPress={() => {
                    setError("");
                    setStep("role");
                  }}
                >
                  <Text style={styles.primaryText}>다음</Text>
                </Pressable>
              </>
            ) : step === "role" ? (
              <>
                <Text style={[styles.title, { color: colors.text }]}>어떤 방식으로 즐기시나요?</Text>
                <Text style={[styles.sub, { color: colors.textMuted }]}>
                  팬으로 응원할지, 코스어로 활동할지 골라 주세요.
                </Text>

                <Pressable
                  style={[
                    styles.roleCard,
                    {
                      borderColor: role === "coser" ? colors.brand : colors.border,
                      backgroundColor: colors.surfaceRaised,
                    },
                  ]}
                  onPress={() => setRole("coser")}
                >
                  <Ionicons
                    name="sparkles"
                    size={22}
                    color={role === "coser" ? colors.brand : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleTitle, { color: colors.text }]}>
                      코스어 / 크리에이터
                    </Text>
                    <Text style={[styles.roleSub, { color: colors.textMuted }]}>
                      컬쳐위키에 코스어 프로필을 등록하고 활동을 시작해요
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={[
                    styles.roleCard,
                    {
                      borderColor: role === "fan" ? colors.brand : colors.border,
                      backgroundColor: colors.surfaceRaised,
                      marginTop: 10,
                    },
                  ]}
                  onPress={() => setRole("fan")}
                >
                  <Ionicons
                    name="heart"
                    size={22}
                    color={role === "fan" ? colors.brand : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleTitle, { color: colors.text }]}>팬</Text>
                    <Text style={[styles.roleSub, { color: colors.textMuted }]}>
                      좋아하는 코스어를 팔로우하며 즐겨요
                    </Text>
                  </View>
                </Pressable>

                {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

                <Pressable
                  style={[styles.primary, { backgroundColor: role ? colors.brand : colors.muted }]}
                  disabled={!role || busy}
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
            birth: {
              birthYear: Number(birthYear),
              birthMonth: Number(birthMonth),
              birthDay: Number(birthDay),
            },
            imageUrl,
            localAvatarUri: localUri,
            role: role ?? "fan",
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
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  maxLength: number;
  colors: { text: string; textMuted: string; border: string; surfaceRaised: string };
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
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
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(9,16,30,0.55)" },
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
