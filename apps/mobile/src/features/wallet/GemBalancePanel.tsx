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
import { fetchGemsWallet, type GemPackage } from "@/api/gems";
import { openGemTopupCheckout } from "@/payments/gem-topup";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

function formatMoco(moco: number) {
  return `${Math.max(0, moco).toLocaleString()} MOCO`;
}

function formatUsdFromMoco(moco: number) {
  return `$${(moco / 100).toFixed(2)}`;
}

export function GemBalancePanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-gems-wallet"],
    queryFn: fetchGemsWallet,
  });

  const data = query.data;
  const balance = data?.balance ?? 0;
  const packages = data?.packages ?? [];
  const purchases = data?.purchases ?? [];
  const termsCopy = data?.termsCopy ?? "";

  async function handleTopup(pack: GemPackage) {
    if (!termsAccepted) {
      Alert.alert("약관 동의", "충전 전 약관에 동의해 주세요.");
      return;
    }
    setBusy(true);
    try {
      const res = await openGemTopupCheckout(pack.gems);
      if ("error" in res) Alert.alert("충전", res.error);
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.card, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.title, { color: colors.text }]}>구매 MOCO</Text>
      <Text style={[styles.balance, { color: colors.text }]}>{formatMoco(balance)}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        ≈ {formatUsdFromMoco(balance)} · 후원·유료 미디어 · 환불·인출 불가
      </Text>

      <Text style={[styles.sectionLabel, { color: colors.text }]}>충전 패키지</Text>
      <View style={styles.packGrid}>
        {packages.map((pack) => (
          <Pressable
            key={pack.gems}
            onPress={() => void handleTopup(pack)}
            disabled={busy}
            style={[styles.packBtn, { borderColor: colors.hairline }]}
          >
            <Text style={[styles.packTitle, { color: colors.text }]}>{formatMoco(pack.gems)}</Text>
            <Text style={[styles.packSub, { color: colors.textMuted }]}>{pack.label.split("(")[1]?.replace(")", "") ?? ""}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => setTermsAccepted((v) => !v)} style={styles.termsRow}>
        <Text style={{ color: termsAccepted ? colors.cobalt : colors.textMuted }}>{termsAccepted ? "☑" : "☐"}</Text>
        <Text style={[styles.terms, { color: colors.textMuted }]}>{termsCopy}</Text>
      </Pressable>

      {purchases.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: spacing.sm }]}>충전 내역</Text>
          {purchases.map((p) => (
            <View key={p.id} style={[styles.purchaseRow, { borderColor: colors.hairline }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.purchaseTitle, { color: colors.text }]}>
                  {formatMoco(p.gems)}
                  {p.remainingGems < p.gems ? " · 일부 사용" : ""}
                </Text>
                <Text style={[styles.purchaseSub, { color: colors.textMuted }]}>
                  잔여 {formatMoco(p.remainingGems)}
                </Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      gap: spacing.sm,
    },
    title: { fontSize: 16, fontWeight: "900" },
    balance: { fontSize: 28, fontWeight: "900" },
    sub: { fontSize: 12, fontWeight: "600" },
    sectionLabel: { fontSize: 14, fontWeight: "800", marginTop: spacing.xs },
    packGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    packBtn: {
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.sm,
      minWidth: "45%",
      flexGrow: 1,
    },
    packTitle: { fontWeight: "800", fontSize: 14 },
    packSub: { fontSize: 11, marginTop: 2 },
    termsRow: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
    terms: { flex: 1, fontSize: 11, lineHeight: 16 },
    purchaseRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.sm,
      gap: spacing.sm,
    },
    purchaseTitle: { fontWeight: "700", fontSize: 13 },
    purchaseSub: { fontSize: 11, marginTop: 2 },
  });
}
