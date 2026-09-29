import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  fetchUsedPhoneStatus,
  sendUsedPhoneOtp,
  verifyUsedPhoneOtp,
} from "@/api/marketplace";
import { ApiError } from "@/api/client";
import { Screen } from "@/ui/Screen";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function UsedPhoneVerifyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "UsedPhoneVerify">>();
  const next = "UsedCreate" as const;
  const { t, u } = useI18n();
  const { colors } = useTheme();
  const [countryCode, setCountryCode] = useState("US");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const status = await fetchUsedPhoneStatus();
        if (!alive) return;
        if (status.countryCode) setCountryCode(status.countryCode);
        if (status.countryCode?.toUpperCase() === "KR" || status.eligible || status.phoneVerified) {
          navigation.replace(next);
          return;
        }
      } catch {
        if (alive) navigation.goBack();
      } finally {
        if (alive) setChecking(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [navigation, next]);

  async function requestOtp() {
    setBusy(true);
    try {
      await sendUsedPhoneOtp(phone.trim());
      setSent(true);
      showIslandSuccess(u("전송됨", "Sent"), u("인증번호를 문자로 보냈습니다.", "We sent a verification code by SMS."));
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : u("인증번호 전송에 실패했습니다.", "Could not send the verification code.");
      showIslandError(u("오류", "Error"), msg);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      await verifyUsedPhoneOtp(phone.trim(), code.trim());
      navigation.replace(next);
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : u("인증에 실패했습니다.", "Verification failed.");
      showIslandError(u("오류", "Error"), msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title={u("휴대폰 인증", "Phone verification")}
        leftLabel={t("common.back")}
        onLeftPress={() => navigation.goBack()}
      />
      {checking ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              {u(
                `중고거래 이용을 위해 휴대폰 SMS 인증이 필요합니다 (${countryCode}).`,
                `SMS phone verification is required for the used marketplace (${countryCode}).`
              )}
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Mobile number"
              editable={!sent}
            />
            {sent ? (
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                placeholder="6-digit code"
                maxLength={6}
              />
            ) : null}
            {!sent ? (
              <FolkButton
                label={u("인증번호 받기", "Send code")}
                loading={busy}
                onPress={() => void requestOtp()}
              />
            ) : (
              <FolkButton
                label={u("인증 완료", "Verify")}
                loading={busy}
                onPress={() => void verify()}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { padding: spacing.md, gap: spacing.md },
  hint: { fontSize: 14, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
});
