import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { respondUsedTradeMeetCompletion } from "@/api/marketplace";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  requestId: string;
  selfUserId: string;
  isBuyer: boolean;
  buyerMeetConfirmedAt: string | null;
  sellerMeetConfirmedAt: string | null;
  onRefresh?: () => void;
};

export function UsedTradeMeetCompletionCard({
  requestId,
  selfUserId,
  isBuyer,
  buyerMeetConfirmedAt,
  sellerMeetConfirmedAt,
  onRefresh,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [busy, setBusy] = useState(false);

  const selfConfirmed = isBuyer ? buyerMeetConfirmedAt : sellerMeetConfirmedAt;
  const peerConfirmed = isBuyer ? sellerMeetConfirmedAt : buyerMeetConfirmedAt;

  async function respond(action: "confirm" | "decline") {
    if (busy || selfConfirmed) return;
    setBusy(true);
    try {
      await respondUsedTradeMeetCompletion(requestId, action);
      onRefresh?.();
      showIslandSuccess(
        action === "confirm" ? t("m.messages.recorded") : t("m.messages.marked_incomplete"),
        action === "confirm" ? t("m.messages.waiting_for_the_other_party") : undefined
      );
    } catch (e) {
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.messages.could_not_complete_action"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("m.messages.was_the_trade_completed")}</Text>
      {selfConfirmed ? (
        <Text style={styles.meta}>
          {peerConfirmed
            ? t("m.messages.trade_marked_complete")
            : t("m.messages.you_confirmed_waiting_for_the_other")}
        </Text>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={[styles.circle, styles.noBtn]}
            disabled={busy}
            onPress={() => void respond("decline")}
            accessibilityLabel={t("m.messages.not_completed")}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="close" size={22} color="#fff" />}
          </Pressable>
          <Pressable
            style={[styles.circle, styles.yesBtn]}
            disabled={busy}
            onPress={() => void respond("confirm")}
            accessibilityLabel={t("m.messages.completed")}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="checkmark" size={22} color="#fff" />}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      maxWidth: 280,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      padding: spacing.md,
      gap: 10,
      marginVertical: 4,
    },
    title: { fontWeight: "800", color: colors.text, fontSize: 14 },
    meta: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    actions: { flexDirection: "row", gap: 16, justifyContent: "center", paddingVertical: 4 },
    circle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    yesBtn: { backgroundColor: "#16a34a" },
    noBtn: { backgroundColor: "#dc2626" },
  });
}
