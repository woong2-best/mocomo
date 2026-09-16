import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
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
import { prepareProfileAvatar } from "@/lib/prepare-profile-media";
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
  }) => void;
};

type Step = "birth" | "avatar" | "done";

/**
 * Mobile signup tail: terms → (this) birth → gallery avatar → fireworks.
 * Banner is intentionally omitted.
 */
export function SignupOnboardingSheet({
  visible,
  mode,
  onClose,
  onFinished,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("birth");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setStep("birth");
      setBusy(false);
      setError("");
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
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

    const birth: SignupOnboardingBirth = {
      birthYear: Number(birthYear),
      birthMonth: Number(birthMonth),
      birthDay: Number(birthDay),
    };

    if (mode === "collectOnly") {
      onFinished({ birth, imageUrl: null, localAvatarUri: localUri });
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

            {step === "birth" ? (
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
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
  },
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
