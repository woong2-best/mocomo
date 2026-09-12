import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchGemsWallet } from "@/api/gems";
import { openGemTopupCheckout } from "@/payments/gem-topup";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

const INPUT_MAX_DIGITS = 7;

function formatMoco(moco: number) {
  return `${Math.max(0, moco).toLocaleString()} MOCO`;
}

function sanitizeAmount(raw: string) {
  return raw.replace(/\D/g, "").slice(0, INPUT_MAX_DIGITS);
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

function NumKey({
  label,
  disabled,
  onPress,
  style,
}: {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.numKey,
        style,
        pressed && styles.keyPressed,
        disabled && styles.keyDisabled,
      ]}
    >
      <Text style={styles.numKeyText}>{label}</Text>
    </Pressable>
  );
}

function ActionKey({
  label,
  sub,
  tone,
  disabled,
  onPress,
  style,
}: {
  label: string;
  sub?: string;
  tone: "clear" | "confirm";
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const isConfirm = tone === "confirm";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionKey,
        isConfirm ? styles.confirmKey : styles.clearKey,
        style,
        pressed && styles.keyPressed,
        disabled && styles.keyDisabled,
      ]}
    >
      <Text style={[styles.actionKeyLabel, isConfirm ? styles.confirmText : styles.clearText]}>{label}</Text>
      {sub ? <Text style={[styles.actionKeySub, isConfirm ? styles.confirmText : styles.clearText]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function GemBalancePanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [statusLine, setStatusLine] = useState("충전할 MOCO 수량을 입력해 주세요.");

  const query = useQuery({
    queryKey: ["mobile-gems-wallet"],
    queryFn: fetchGemsWallet,
  });

  const data = query.data;
  const balance = data?.balance ?? 0;
  const minTopup = data?.minTopupMoco ?? 1;
  const purchases = data?.purchases ?? [];
  const termsCopy = data?.termsCopy ?? "";
  const parsed = parseAmount(amount);
  const displayAmount = amount ? Number(amount).toLocaleString() : "0";

  function appendDigit(digit: string) {
    if (busy) return;
    const next = sanitizeAmount(amount + digit).replace(/^0+(?=\d)/, "");
    setAmount(next);
    setStatusLine("수량을 확인한 뒤 [확인]을 눌러 주세요.");
  }

  function backspace() {
    if (busy || !amount) return;
    setAmount(amount.slice(0, -1));
    setStatusLine("충전할 MOCO 수량을 입력해 주세요.");
  }

  async function handleTopup() {
    if (!termsAccepted) {
      Alert.alert("약관 동의", "충전 전 약관에 동의해 주세요.");
      return;
    }
    const moco = parseAmount(amount);
    if (moco == null || moco < minTopup) {
      Alert.alert("충전", `최소 ${minTopup} MOCO부터 충전할 수 있습니다.`);
      return;
    }
    setBusy(true);
    setStatusLine("결제 화면으로 이동합니다…");
    try {
      const res = await openGemTopupCheckout(moco);
      if ("error" in res) {
        Alert.alert("충전", res.error);
        setStatusLine(res.error);
      }
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={styles.shell}>
      <View style={styles.body}>
        <View style={styles.fascia}>
          <View style={styles.statusDot} />
          <Text style={styles.fasciaLabel}>MoCoMo ATM</Text>
          <Text style={styles.fasciaSecure}>SECURE</Text>
        </View>

        <View style={styles.bezel}>
          <View style={styles.screen}>
            <Text style={styles.screenCaption}>현재 잔액</Text>
            <Text style={styles.balance}>{formatMoco(balance)}</Text>
            <View style={styles.divider} />
            <Text style={styles.screenCaption}>충전 수량</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountValue}>{displayAmount}</Text>
              <Text style={styles.amountUnit}>MOCO</Text>
            </View>
            <Text style={styles.hint}>1 단위 정수 · 최소 {minTopup} MOCO</Text>
          </View>
        </View>

        <View style={styles.ticker}>
          <Text style={styles.tickerText}>{busy ? "결제 화면으로 이동 중…" : statusLine}</Text>
        </View>

        <View style={styles.keypadWell}>
          <View style={styles.keypadRow}>
            <View style={styles.numPad}>
              {[["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]].map((row) => (
                <View key={row.join("-")} style={styles.numRow}>
                  {row.map((digit) => (
                    <NumKey
                      key={digit}
                      label={digit}
                      disabled={busy}
                      onPress={() => appendDigit(digit)}
                      style={styles.numCell}
                    />
                  ))}
                </View>
              ))}
              <NumKey label="0" disabled={busy} onPress={() => appendDigit("0")} style={styles.zeroKey} />
            </View>
            <View style={styles.actionCol}>
              <ActionKey
                label="지우기"
                sub="←"
                tone="clear"
                disabled={busy || !amount}
                onPress={backspace}
                style={styles.actionCellTop}
              />
              <ActionKey
                label="확인"
                sub="OK"
                tone="confirm"
                disabled={busy || !amount || parsed == null || parsed < minTopup}
                onPress={() => void handleTopup()}
                style={styles.actionCellBottom}
              />
            </View>
          </View>
        </View>

        <Pressable onPress={() => setTermsAccepted((v) => !v)} style={styles.termsRow}>
          <Text style={{ color: termsAccepted ? "#34d399" : colors.textMuted }}>{termsAccepted ? "☑" : "☐"}</Text>
          <Text style={styles.terms}>{termsCopy}</Text>
        </Pressable>

        {purchases.length > 0 ? (
          <>
            <Text style={styles.historyCaption}>충전 내역</Text>
            {purchases.map((p) => (
              <View key={p.id} style={styles.purchaseRow}>
                <Text style={styles.purchaseTitle}>
                  {formatMoco(p.gems)}
                  {p.remainingGems < p.gems ? " · 일부 사용" : ""}
                </Text>
                <Text style={styles.purchaseSub}>잔여 {formatMoco(p.remainingGems)}</Text>
              </View>
            ))}
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  numKey: {
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#8a9199",
    backgroundColor: "#e3e6ea",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  numKeyText: { fontSize: 24, fontWeight: "900", color: "#1a1f26" },
  actionKey: {
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  clearKey: { backgroundColor: "#f5c842", borderColor: "#9a7a12" },
  confirmKey: { backgroundColor: "#2db868", borderColor: "#1f6b3f" },
  clearText: { color: "#5c3d00" },
  confirmText: { color: "#0b2e18" },
  actionKeyLabel: { fontSize: 15, fontWeight: "900" },
  actionKeySub: { fontSize: 10, fontWeight: "800", marginTop: 2 },
  keyPressed: { transform: [{ translateY: 2 }], opacity: 0.92 },
  keyDisabled: { opacity: 0.45 },
  keypadRow: { flexDirection: "row", gap: 8 },
  numPad: { flex: 3, gap: 8 },
  numRow: { flexDirection: "row", gap: 8 },
  numCell: { flex: 1 },
  zeroKey: { width: "100%" },
  actionCol: { flex: 1, gap: 8 },
  actionCellTop: { flex: 1, minHeight: 112 },
  actionCellBottom: { flex: 1, minHeight: 112 },
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    shell: {
      marginHorizontal: spacing.md,
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#6b7280",
      backgroundColor: "#aeb4bd",
      padding: 6,
    },
    body: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#4b5563",
      backgroundColor: "#0b1018",
      overflow: "hidden",
      paddingBottom: spacing.md,
    },
    fascia: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#374151",
      backgroundColor: "#111827",
    },
    statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#34d399" },
    fasciaLabel: {
      flex: 1,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 2,
      color: "#94a3b8",
    },
    fasciaSecure: { fontSize: 10, fontWeight: "700", color: "#64748b" },
    bezel: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#374151",
      backgroundColor: "#030712",
      padding: 4,
    },
    screen: {
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#1f2937",
      backgroundColor: "#060d18",
      padding: spacing.md,
    },
    screenCaption: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
      color: "#22d3ee",
      opacity: 0.8,
    },
    balance: {
      marginTop: 4,
      fontSize: 22,
      fontWeight: "900",
      color: "#6ee7b7",
      fontVariant: ["tabular-nums"],
    },
    divider: {
      height: 1,
      marginVertical: spacing.sm,
      backgroundColor: "#334155",
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "baseline",
      marginTop: 6,
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 8,
      backgroundColor: "#020617",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    amountValue: {
      flex: 1,
      fontSize: 36,
      fontWeight: "900",
      color: "#f8fafc",
      fontVariant: ["tabular-nums"],
    },
    amountUnit: { fontSize: 14, fontWeight: "800", color: "#94a3b8" },
    hint: { marginTop: 6, fontSize: 11, fontWeight: "600", color: "#64748b" },
    ticker: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#78350f",
      backgroundColor: "#1a1205",
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
    },
    tickerText: { fontSize: 12, fontWeight: "700", color: "#fcd34d" },
    keypadWell: {
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#6b7280",
      backgroundColor: "#b8bcc4",
      padding: spacing.sm,
    },
    termsRow: {
      flexDirection: "row",
      gap: spacing.sm,
      alignItems: "flex-start",
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    terms: { flex: 1, fontSize: 11, lineHeight: 16, color: "#94a3b8" },
    historyCaption: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1,
      color: "#64748b",
    },
    purchaseRow: {
      marginHorizontal: spacing.md,
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 8,
      padding: spacing.sm,
      backgroundColor: "rgba(15, 23, 42, 0.5)",
    },
    purchaseTitle: { fontWeight: "700", fontSize: 13, color: "#e2e8f0" },
    purchaseSub: { fontSize: 11, marginTop: 2, color: "#64748b" },
  });
}
