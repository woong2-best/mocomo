import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/config/env";
import { SIGNUP_PRIVACY_PATH, SIGNUP_TERMS_PATH } from "@/lib/signup-legal-links";
import type { SignupOnboardingBirth } from "@/features/auth/SignupOnboardingSheet";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/tokens";
import { radii } from "@/theme/tokens";

const WEB = API_BASE_URL.replace(/\/$/, "");

export type TermsAccountPreview = {
  email: string | null;
  name: string | null;
  image: string | null;
};

type Props = {
  visible: boolean;
  account?: TermsAccountPreview | null;
  busy?: boolean;
  error?: string;
  onClose: () => void;
  onAgree: (birth: SignupOnboardingBirth) => void;
};

function sanitizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function birthValid(year: string, month: string, day: string) {
  if (year.trim().length !== 4) return false;
  const m = Number(month);
  const d = Number(day);
  if (month.length < 1 || month.length > 2 || m < 1 || m > 12) return false;
  if (day.length < 1 || day.length > 2 || d < 1 || d > 31) return false;
  return true;
}

function Checkbox({
  colors,
  checked,
  onPress,
  label,
  linkPath,
}: {
  colors: ThemeColors;
  checked: boolean;
  onPress: () => void;
  label: string;
  linkPath: string;
}) {
  const { u } = useI18n();
  return (
    <View style={styles.checkRow}>
      <Pressable style={styles.checkTap} onPress={onPress} hitSlop={8}>
        <View
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            checked && { backgroundColor: colors.brand, borderColor: colors.brand },
          ]}
        >
          {checked ? (
            <Ionicons name="checkmark" size={14} color={colors.textOnAccent} />
          ) : null}
        </View>
        <Text style={[styles.checkLabel, { color: colors.text }]}>
          {u("(필수)", "(Required)")} {label}
        </Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openURL(`${WEB}${linkPath}`)} hitSlop={8}>
        <Text style={[styles.viewLink, { color: colors.textMuted }]}>{u("보기 ›", "View ›")}</Text>
      </Pressable>
    </View>
  );
}

function BirthField({
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
  colors: ThemeColors;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChangeText(sanitizeDigits(t, maxLength))}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        maxLength={maxLength}
        style={[
          styles.birthInput,
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

/** Birth + terms before account creation (OAuth signup). */
export function TermsConsentSheet({
  visible,
  account,
  busy,
  error,
  onClose,
  onAgree,
}: Props) {
  const { t, u } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!visible) {
      setTerms(false);
      setPrivacy(false);
      setBirthYear("");
      setBirthMonth("");
      setBirthDay("");
      setLocalError("");
    }
  }, [visible]);

  const birthOk = birthValid(birthYear, birthMonth, birthDay);
  const canSubmit = terms && privacy && birthOk && !busy;

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
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />

          <View style={styles.brandWrap}>
            <Text style={styles.brandMark}>MoCoMo</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t("auth.signupTitle")}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {u("생년월일과 필수 약관에 동의해 주세요.", "Enter your date of birth and accept the required terms.")}
          </Text>

          {account ? (
            <View style={styles.accountLine}>
              <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                {account.name || account.email || u("새 계정", "New account")}
              </Text>
              {account.email ? (
                <Text style={[styles.accountEmail, { color: colors.textMuted }]} numberOfLines={1}>
                  {account.email}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {u("생년월일 *", "Date of birth *")}
          </Text>
          <View style={styles.birthRow}>
            <BirthField
              label={u("년", "Year")}
              value={birthYear}
              onChangeText={setBirthYear}
              placeholder="YYYY"
              maxLength={4}
              colors={colors}
            />
            <BirthField
              label={u("월", "Month")}
              value={birthMonth}
              onChangeText={setBirthMonth}
              placeholder="MM"
              maxLength={2}
              colors={colors}
            />
            <BirthField
              label={u("일", "Day")}
              value={birthDay}
              onChangeText={setBirthDay}
              placeholder="DD"
              maxLength={2}
              colors={colors}
            />
          </View>
          <Text style={[styles.birthHint, { color: colors.textMuted }]}>
            {u(
              "허위 생년월일 기재 시 약관에 따라 계정이 제한될 수 있습니다.",
              "False birth dates may lead to account restrictions under our terms."
            )}
          </Text>

          <View style={styles.consentBlock}>
            <Checkbox
              colors={colors}
              checked={terms}
              onPress={() => setTerms((v) => !v)}
              label={t("auth.termsOfService")}
              linkPath={SIGNUP_TERMS_PATH}
            />
            <Checkbox
              colors={colors}
              checked={privacy}
              onPress={() => setPrivacy((v) => !v)}
              label={u("개인정보 처리방침 (접속 IP·기기 정보 수집 포함)", "Privacy policy (includes IP & device data)")}
              linkPath={SIGNUP_PRIVACY_PATH}
            />
          </View>
          <Text style={[styles.ipNote, { color: colors.textMuted }]}>
            {u(
              "가입 시 서비스 보안·부정 이용 방지를 위해 접속 IP 주소가 자동 수집·보관됩니다.",
              "Your IP address is collected automatically at signup for security and abuse prevention."
            )}
          </Text>

          {localError || error ? (
            <Text style={[styles.error, { color: colors.danger }]}>
              {localError || error}
            </Text>
          ) : null}

          <Pressable
            style={[
              styles.agreeBtn,
              { backgroundColor: canSubmit ? colors.brand : colors.muted },
            ]}
            disabled={!canSubmit}
            onPress={() => {
              if (!birthOk) {
                setLocalError(
                  u(
                    "생년월일을 확인해 주세요. (연 4자리, 월·일 각 2자리)",
                    "Check your date of birth. (4-digit year, 2-digit month and day)"
                  )
                );
                return;
              }
              setLocalError("");
              onAgree({
                birthYear: Number(birthYear),
                birthMonth: Number(birthMonth),
                birthDay: Number(birthDay),
              });
            }}
          >
            {busy ? (
              <ActivityIndicator color={colors.textOnAccent} />
            ) : (
              <Text
                style={[
                  styles.agreeText,
                  { color: canSubmit ? colors.textOnAccent : colors.textMuted },
                ]}
              >
                {u("동의하고 계속", "Agree and continue")}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(9, 16, 30, 0.6)" },
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
    marginBottom: 12,
  },
  brandWrap: {
    backgroundColor: "#0f1a33",
    borderRadius: radii.lg,
    paddingVertical: 18,
    marginBottom: 12,
  },
  brandMark: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#FFFFFF",
    textAlign: "center",
  },
  title: { fontSize: 20, fontWeight: "800", letterSpacing: -0.3, textAlign: "center" },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 14, lineHeight: 20, textAlign: "center" },
  accountLine: { marginBottom: 12, alignItems: "center" },
  accountName: { fontSize: 15, fontWeight: "700" },
  accountEmail: { fontSize: 13, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  birthRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  birthInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  birthHint: { fontSize: 11, lineHeight: 16, marginBottom: 12 },
  consentBlock: { marginBottom: 16 },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  checkTap: { flexDirection: "row", alignItems: "center", flex: 1, gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { fontSize: 15, fontWeight: "600", flex: 1 },
  viewLink: { fontSize: 14, fontWeight: "600" },
  ipNote: { fontSize: 11, lineHeight: 16, marginBottom: 12, paddingHorizontal: 2 },
  error: { fontSize: 13, fontWeight: "600", textAlign: "center", marginBottom: 10 },
  agreeBtn: {
    borderRadius: radii.pill,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  agreeText: { fontSize: 16, fontWeight: "800" },
});
