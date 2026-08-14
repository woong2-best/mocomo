import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import {
  fetchUsedBankStatus,
  sendUsedBankVerification,
  verifyUsedBankCode,
} from "@/api/marketplace";
import { getBankByCode, getQuickPickBanks, searchKrBanks } from "@/lib/apick-bank-codes";
import { ApiError } from "@/api/client";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function UsedPhoneVerifyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const statusQuery = useQuery({
    queryKey: ["mobile-used-bank-status"],
    queryFn: fetchUsedBankStatus,
  });

  const [bankCode, setBankCode] = useState("004");
  const [bankSearch, setBankSearch] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [accountNum, setAccountNum] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const quickBanks = getQuickPickBanks();
  const filteredBanks = useMemo(() => searchKrBanks(bankSearch), [bankSearch]);
  const selectedBank = getBankByCode(bankCode);

  async function onSend() {
    setBusy(true);
    setMessage("");
    try {
      const res = await sendUsedBankVerification(bankCode, accountNum);
      if (res.alreadyVerified) {
        Alert.alert("인증 완료", res.message ?? "이미 인증된 계좌입니다.", [
          { text: "글쓰기", onPress: () => navigation.replace("UsedCreate") },
        ]);
        return;
      }
      setSent(true);
      const remain =
        typeof res.sendsRemaining === "number" ? ` (오늘 ${res.sendsRemaining}회 남음)` : "";
      setMessage((res.message ?? "1원을 보냈습니다.") + remain);
      if (res.devCode) setCode(res.devCode);
    } catch (e) {
      Alert.alert("오류", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    setBusy(true);
    try {
      await verifyUsedBankCode(bankCode, accountNum, code);
      Alert.alert("인증 완료", "계좌 1원 인증이 완료되었습니다.", [
        { text: "글쓰기", onPress: () => navigation.replace("UsedCreate") },
      ]);
    } catch (e) {
      Alert.alert("오류", errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (statusQuery.data?.eligible) {
    return (
      <Screen>
        <AppHeader title="중고거래" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
        <View style={styles.body}>
          <Text style={styles.heading}>이미 인증됨</Text>
          <Text style={styles.sub}>
            {statusQuery.data.displayAccount
              ? `${statusQuery.data.displayAccount} 계좌로 인증되어 있습니다.`
              : "계좌 인증이 완료된 계정입니다."}
          </Text>
          <FolkButton label="글쓰기로 이동" onPress={() => navigation.replace("UsedCreate")} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="중고거래" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>계좌 1원 인증</Text>
          <Text style={styles.sub}>🇰🇷 본인 명의 한국 계좌 · 입금통장메모 4자리 입력</Text>

          <FolkCard>
            <Text style={styles.sectionLabel}>자주 쓰는 은행</Text>
            <View style={styles.chipRow}>
              {quickBanks.map((b) => (
                <Pressable
                  key={b.code}
                  onPress={() => {
                    setBankCode(b.code);
                    setListOpen(false);
                  }}
                  style={[styles.chip, bankCode === b.code && styles.chipActive]}
                >
                  <Text style={[styles.chipText, bankCode === b.code && styles.chipTextActive]}>
                    {b.shortName}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>은행 검색</Text>
            <TextInput
              style={styles.input}
              value={bankSearch}
              onChangeText={(v) => {
                setBankSearch(v);
                setListOpen(true);
              }}
              placeholder='예: "미래", "키움", "Chase"'
              placeholderTextColor={colors.textMuted}
              editable={!busy}
            />

            <Pressable
              style={styles.selector}
              onPress={() => setListOpen((o) => !o)}
              disabled={busy}
            >
              <Text style={styles.selectorText}>
                {selectedBank ? `${selectedBank.name} (${selectedBank.code})` : "은행 선택"}
              </Text>
              <Ionicons
                name={listOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {listOpen && (
              <View style={styles.listBox}>
                {filteredBanks.map((b) => (
                  <Pressable
                    key={b.code}
                    onPress={() => {
                      setBankCode(b.code);
                      setListOpen(false);
                      setBankSearch("");
                    }}
                    style={[styles.listRow, bankCode === b.code && styles.listRowActive]}
                  >
                    <Text style={styles.listName}>{b.name}</Text>
                    <Text style={styles.listCode}>{b.code}</Text>
                  </Pressable>
                ))}
                {filteredBanks.length === 0 && (
                  <Text style={styles.emptyList}>검색 결과가 없습니다</Text>
                )}
              </View>
            )}

            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              value={accountNum}
              onChangeText={(v) => setAccountNum(v.replace(/\D/g, ""))}
              placeholder="계좌번호 (숫자만)"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              editable={!busy}
            />

            {sent ? (
              <>
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  value={code}
                  onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4))}
                  placeholder="입금통장메모 4자리"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="characters"
                  maxLength={4}
                  editable={!busy}
                />
                <FolkButton
                  label="인증 완료"
                  loading={busy}
                  onPress={() => void onVerify()}
                  style={{ marginTop: 12 }}
                />
              </>
            ) : (
              <FolkButton
                label="1원 인증 요청"
                loading={busy}
                onPress={() => void onSend()}
                style={{ marginTop: 12 }}
              />
            )}

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </FolkCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return "요청에 실패했습니다.";
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, gap: 10, paddingBottom: 48 },
    heading: { fontSize: 24, fontWeight: "800", color: colors.brand },
    sub: { color: colors.textMuted, marginBottom: 8, fontWeight: "600" },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.textMuted,
      marginBottom: 8,
      marginTop: 4,
    },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
    chip: {
      borderWidth: 1,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    chipActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    chipText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    chipTextActive: { color: "#fff" },
    input: {
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
    },
    selector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginTop: 8,
      backgroundColor: colors.surfaceRaised,
    },
    selectorText: { flex: 1, fontWeight: "700", color: colors.text },
    listBox: {
      maxHeight: 200,
      borderWidth: 1,
      borderColor: "rgba(27, 74, 140, 0.15)",
      borderRadius: radii.md,
      marginTop: 6,
      overflow: "hidden",
    },
    listRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(27, 74, 140, 0.12)",
    },
    listRowActive: { backgroundColor: "rgba(27, 74, 140, 0.08)" },
    listName: { fontWeight: "600", color: colors.text, flex: 1 },
    listCode: { color: colors.textMuted, fontSize: 12 },
    emptyList: { padding: 16, textAlign: "center", color: colors.textMuted },
    message: { marginTop: 10, color: colors.cobalt, fontWeight: "600", fontSize: 13 },
  });
}
