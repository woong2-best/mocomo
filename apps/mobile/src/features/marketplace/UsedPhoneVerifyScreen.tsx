import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
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
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function UsedPhoneVerifyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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
        if (status.countryCode?.toUpperCase() === "KR") {
          navigation.replace("Wallet", { initialTab: "earnings", returnScreen: "UsedCreate" });
          return;
        }
        if (status.eligible || status.phoneVerified) {
          navigation.replace("UsedCreate");
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
  }, [navigation]);

  async function requestOtp() {
    setBusy(true);
    try {
      await sendUsedPhoneOtp(phone.trim());
      setSent(true);
      Alert.alert("전송됨", "인증번호를 문자로 보냈습니다.");
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : "인증번호 전송에 실패했습니다.";
      Alert.alert("오류", msg);
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    try {
      await verifyUsedPhoneOtp(phone.trim(), code.trim());
      navigation.replace("UsedCreate");
    } catch (e) {
      const msg =
        e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body
          ? String((e.body as { error: string }).error)
          : "인증에 실패했습니다.";
      Alert.alert("오류", msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="휴대폰 인증" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
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
              중고거래 이용을 위해 휴대폰 SMS 인증이 필요합니다 ({countryCode}).
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
              <FolkButton label="인증번호 받기" loading={busy} onPress={() => void requestOtp()} />
            ) : (
              <FolkButton label="인증 완료" loading={busy} onPress={() => void verify()} />
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
