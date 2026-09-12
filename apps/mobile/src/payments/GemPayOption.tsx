import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { payCheckoutWithGems } from "@/api/checkout-payment";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  orderId: string | null;
  gemBalance: number;
  gemsRequired: number;
  amountLabel: string;
  disabled?: boolean;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onTopupPress?: () => void;
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
  onTopupPress,
}: Props) {
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
      onError(e instanceof Error ? e.message : "MOCO 결제에 실패했습니다.");
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
      <Text style={[styles.title, { color: colors.text }]}>MOCO 잔액으로 결제</Text>
      <Text style={[styles.meta, { color: colors.textMuted }]}>
        보유 {formatMoco(gemBalance)} · 필요 {formatMoco(gemsRequired)}
      </Text>
      <Text style={[styles.hint, { color: colors.textMuted }]}>{amountLabel} · 즉시 결제</Text>
      <FolkButton
        label={pending ? "결제 중…" : canPay ? `${formatMoco(gemsRequired)}로 결제` : "MOCO 잔액 부족"}
        onPress={() => void handlePay()}
        loading={pending}
        disabled={disabled || !canPay}
      />
      {!canPay && onTopupPress ? (
        <Pressable onPress={onTopupPress}>
          <Text style={[styles.topupLink, { color: colors.cobalt }]}>지갑에서 MOCO 충전</Text>
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
