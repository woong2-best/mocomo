import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { payCheckoutWithGems } from "@/api/checkout-payment";
import { API_BASE_URL } from "@/config/env";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  orderId: string | null;
  gemBalance: number;
  gemsRequired: number;
  amountLabel: string;
  disabled?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
};

function formatMoco(moco: number) {
  return `${Math.max(0, moco).toLocaleString()} MOCO`;
}

export function GemPayOption({
  orderId,
  gemBalance,
  gemsRequired,
  amountLabel,
  disabled,
  onSuccess,
  onError,
}: Props) {
  const { u } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles();
  const [pending, setPending] = useState(false);
  const canPay = gemsRequired > 0 && gemBalance >= gemsRequired && !!orderId;

  async function handlePay() {
    if (!orderId || !canPay) return;
    setPending(true);
    try {
      await payCheckoutWithGems(orderId);
      onSuccess();
    } catch (e: unknown) {
      onError(e instanceof Error ? e.message : u("MOCO 결제에 실패했습니다.", "MOCO payment failed."));
    } finally {
      setPending(false);
    }
  }

  return (
    <View
      style={[
        styles.wrap,
        {
          borderColor: canPay ? `${colors.cobalt}66` : colors.hairline,
          backgroundColor: canPay ? `${colors.cobalt}12` : colors.surface,
        },
      ]}
    >
      <Text style={[styles.title, { color: colors.text }]}>{u("MOCO 잔액으로 결제", "Pay with MOCO balance")}</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        {u("보유", "Balance")} {formatMoco(gemBalance)} · {u("필요", "Need")} {formatMoco(gemsRequired)}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>
        {amountLabel} · {u("즉시 결제", "Instant payment")}
      </Text>
      <FolkButton
        label={
          pending
            ? u("결제 중…", "Paying…")
            : canPay
              ? u(`${formatMoco(gemsRequired)}로 결제`, `Pay ${formatMoco(gemsRequired)}`)
              : u("MOCO 잔액 부족", "Insufficient MOCO")
        }
        onPress={() => void handlePay()}
        loading={pending}
        disabled={disabled || !canPay}
      />
      {!canPay ? (
        <Pressable onPress={() => void Linking.openURL(`${API_BASE_URL.replace(/\/$/, "")}/wallet`)}>
          <Text style={[styles.topupLink, { color: colors.cobalt }]}>
            {u("웹사이트에서 MOCO 충전", "Top up MOCO on the website")}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    wrap: {
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      marginBottom: spacing.sm,
      gap: spacing.xs,
    },
    title: { fontWeight: "800", fontSize: 14 },
    meta: { fontSize: 12, fontWeight: "600" },
    hint: { fontSize: 11, fontWeight: "600" },
    topupLink: { fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: spacing.xs },
  });
}
