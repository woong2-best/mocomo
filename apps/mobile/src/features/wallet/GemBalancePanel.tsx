import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchGemsWallet } from "@/api/gems";
import { openGemTopupCheckout } from "@/payments/gem-topup";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100] as const;

function formatMoco(moco: number) {
  return `${Math.max(0, moco).toLocaleString()} MOCO`;
}

function sanitizeAmount(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 3);
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

export function GemBalancePanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("1");

  const query = useQuery({
    queryKey: ["mobile-gems-wallet"],
    queryFn: fetchGemsWallet,
  });

  const data = query.data;
  const balance = data?.balance ?? 0;
  const minTopup = data?.minTopupMoco ?? 1;
  const maxTopup = data?.maxTopupMoco ?? 200;
  const purchases = data?.purchases ?? [];
  const termsCopy = data?.termsCopy ?? "";
  const parsed = parseAmount(amount);

  async function handleTopup() {
    if (!termsAccepted) {
      Alert.alert("약관 동의", "충전 전 약관에 동의해 주세요.");
      return;
    }
    const moco = parseAmount(amount);
    if (moco == null) {
      Alert.alert("충전", "MOCO는 1 단위 정수로만 입력할 수 있습니다.");
      return;
    }
    if (moco < minTopup) {
      Alert.alert("충전", `최소 ${minTopup} MOCO부터 충전할 수 있습니다.`);
      return;
    }
    if (moco > maxTopup) {
      Alert.alert("충전", `1회 충전은 최대 ${maxTopup.toLocaleString()} MOCO까지 가능합니다.`);
      return;
    }
    setBusy(true);
    try {
      const res = await openGemTopupCheckout(moco);
      if ("error" in res) Alert.alert("충전", res.error);
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.card, { borderColor: "#334155", backgroundColor: "#0c1220" }]}>
      <View style={styles.headerStrip}>
        <View style={styles.statusDot} />
        <Text style={styles.headerLabel}>MOCO 충전 터미널</Text>
      </View>

      <Text style={styles.sectionCaption}>현재 잔액</Text>
      <View style={styles.balanceScreen}>
        <Text style={styles.balance}>{formatMoco(balance)}</Text>
      </View>
      <Text style={styles.sub}>후원·유료 미디어 · 환불·인출 불가</Text>

      <Text style={styles.sectionCaption}>충전 수량 (정수 단위)</Text>
      <View style={styles.amountScreen}>
        <TextInput
          value={amount}
          onChangeText={(t) => setAmount(sanitizeAmount(t))}
          keyboardType="number-pad"
          editable={!busy}
          style={styles.amountInput}
          placeholder="1"
          placeholderTextColor="#475569"
        />
        <Text style={styles.amountUnit}>MOCO</Text>
      </View>
      <Text style={styles.hint}>
        {minTopup.toLocaleString()}~{maxTopup.toLocaleString()} MOCO · 1 단위 정수만 가능
      </Text>

      <View style={styles.quickGrid}>
        {QUICK_AMOUNTS.filter((n) => n <= maxTopup).map((n) => (
          <Pressable
            key={n}
            disabled={busy}
            onPress={() => setAmount(String(n))}
            style={[styles.quickBtn, parsed === n && styles.quickBtnActive]}
          >
            <Text style={[styles.quickBtnText, parsed === n && styles.quickBtnTextActive]}>{n}</Text>
          </Pressable>
        ))}
        <Pressable disabled={busy} onPress={() => setAmount(String(maxTopup))} style={styles.quickBtn}>
          <Text style={styles.quickBtnText}>MAX</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => setAmount("")} style={styles.quickBtn}>
          <Text style={styles.quickBtnText}>CLR</Text>
        </Pressable>
      </View>

      <Pressable onPress={() => setTermsAccepted((v) => !v)} style={styles.termsRow}>
        <Text style={{ color: termsAccepted ? "#34d399" : colors.textMuted }}>{termsAccepted ? "☑" : "☐"}</Text>
        <Text style={styles.terms}>{termsCopy}</Text>
      </Pressable>

      <FolkButton
        label={busy ? "이동 중…" : "MOCO 충전 확인"}
        onPress={() => void handleTopup()}
        loading={busy}
        disabled={!amount || parsed == null || parsed < minTopup}
      />

      {purchases.length > 0 ? (
        <>
          <Text style={[styles.sectionCaption, { marginTop: spacing.sm }]}>충전 내역</Text>
          {purchases.map((p) => (
            <View key={p.id} style={styles.purchaseRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.purchaseTitle}>
                  {formatMoco(p.gems)}
                  {p.remainingGems < p.gems ? " · 일부 사용" : ""}
                </Text>
                <Text style={styles.purchaseSub}>잔여 {formatMoco(p.remainingGems)}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      gap: spacing.sm,
      overflow: "hidden",
    },
    headerStrip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#34d399",
    },
    headerLabel: {
      fontSize: 10,
      fontWeight: "800",
      letterSpacing: 1.5,
      color: "#94a3b8",
      textTransform: "uppercase",
    },
    sectionCaption: {
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.5,
      color: "#64748b",
      textTransform: "uppercase",
    },
    balanceScreen: {
      backgroundColor: "#060a12",
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    balance: {
      fontSize: 28,
      fontWeight: "900",
      color: "#6ee7b7",
      fontVariant: ["tabular-nums"],
    },
    sub: { fontSize: 11, fontWeight: "600", color: "#64748b" },
    amountScreen: {
      flexDirection: "row",
      alignItems: "baseline",
      backgroundColor: "#060a12",
      borderWidth: 1,
      borderColor: "#475569",
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    amountInput: {
      flex: 1,
      fontSize: 36,
      fontWeight: "900",
      color: "#f8fafc",
      fontVariant: ["tabular-nums"],
      padding: 0,
    },
    amountUnit: { fontSize: 14, fontWeight: "800", color: "#94a3b8" },
    hint: { fontSize: 11, fontWeight: "600", color: "#64748b" },
    quickGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    quickBtn: {
      minWidth: "30%",
      flexGrow: 1,
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 10,
      backgroundColor: "#1e293b",
      paddingVertical: 10,
      alignItems: "center",
    },
    quickBtnActive: {
      borderColor: "#34d399",
      backgroundColor: "rgba(52, 211, 153, 0.12)",
    },
    quickBtnText: {
      fontSize: 14,
      fontWeight: "800",
      color: "#e2e8f0",
      fontVariant: ["tabular-nums"],
    },
    quickBtnTextActive: { color: "#6ee7b7" },
    termsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
    terms: { flex: 1, fontSize: 11, lineHeight: 16, color: "#94a3b8" },
    purchaseRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "#334155",
      borderRadius: 10,
      padding: spacing.sm,
      backgroundColor: "rgba(15, 23, 42, 0.5)",
    },
    purchaseTitle: { fontWeight: "700", fontSize: 13, color: "#e2e8f0" },
    purchaseSub: { fontSize: 11, marginTop: 2, color: "#64748b" },
  });
}
