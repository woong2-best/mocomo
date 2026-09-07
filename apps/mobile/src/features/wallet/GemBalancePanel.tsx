import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchGemsWallet, refundGemPurchase, type GemPackage } from "@/api/gems";
import { openGemTopupCheckout } from "@/payments/gem-topup";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

function formatGems(gems: number) {
  return `${Math.max(0, gems).toLocaleString()} Gems`;
}

function formatUsdFromGems(gems: number) {
  return `$${(gems / 100).toFixed(2)}`;
}

export function GemBalancePanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
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

  async function handleRefund(purchaseId: string) {
    setBusy(true);
    try {
      await refundGemPurchase(purchaseId);
      await queryClient.invalidateQueries({ queryKey: ["mobile-gems-wallet"] });
      Alert.alert("환불", "환불이 처리되었습니다.");
    } catch (e: unknown) {
      Alert.alert("환불", e instanceof Error ? e.message : "환불에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (query.isLoading) {
    return <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />;
  }

  return (
    <View style={[styles.card, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.title, { color: colors.text }]}>💎 젬 (Gems)</Text>
      <Text style={[styles.balance, { color: colors.text }]}>{formatGems(balance)}</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        ≈ {formatUsdFromGems(balance)} · 후원·유료 미디어
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
            <Text style={[styles.packGems, { color: colors.text }]}>{formatGems(pack.gems)}</Text>
            <Text style={[styles.packUsd, { color: colors.textMuted }]}>{formatUsdFromGems(pack.gems)}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => setTermsAccepted((v) => !v)} style={styles.termsRow}>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: termsAccepted ? colors.cobalt : colors.hairline,
              backgroundColor: termsAccepted ? `${colors.cobalt}33` : "transparent",
            },
          ]}
        />
        <Text style={[styles.termsText, { color: colors.textMuted }]}>{termsCopy}</Text>
      </Pressable>

      {purchases.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: spacing.sm }]}>
            충전 내역
          </Text>
          {purchases.slice(0, 8).map((p) => (
            <View key={p.id} style={[styles.purchaseRow, { borderColor: colors.hairline }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.purchaseTitle, { color: colors.text }]}>
                  {formatGems(p.gems)}
                  {p.refunded ? " · 환불됨" : ""}
                </Text>
                <Text style={[styles.purchaseMeta, { color: colors.textMuted }]}>
                  잔여 {formatGems(p.remainingGems)}
                </Text>
              </View>
              {!p.refunded && p.remainingGems > 0 ? (
                <FolkButton
                  label="환불"
                  variant="ghost"
                  onPress={() => void handleRefund(p.id)}
                  disabled={busy}
                />
              ) : null}
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
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    title: { fontSize: 16, fontWeight: "900" },
    balance: { fontSize: 28, fontWeight: "900", marginTop: spacing.xs },
    sub: { fontSize: 12, fontWeight: "600", marginTop: 2 },
    sectionLabel: { fontSize: 14, fontWeight: "800", marginTop: spacing.md, marginBottom: spacing.sm },
    packGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    packBtn: {
      width: "47%",
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
    },
    packGems: { fontWeight: "800", fontSize: 14 },
    packUsd: { fontSize: 11, fontWeight: "600", marginTop: 2 },
    termsRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md },
    checkbox: { width: 18, height: 18, borderWidth: 1.5, borderRadius: 4, marginTop: 2 },
    termsText: { flex: 1, fontSize: 10, fontWeight: "600", lineHeight: 15 },
    purchaseRow: {
      flexDirection: "row",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 12,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    purchaseTitle: { fontWeight: "700", fontSize: 13 },
    purchaseMeta: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  });
}
