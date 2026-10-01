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
  const { u } = useI18n();
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
        action === "confirm" ? u("응답했습니다", "Recorded") : u("거래 미완료 처리", "Marked incomplete"),
        action === "confirm" ? u("상대방 확인을 기다립니다.", "Waiting for the other party.") : undefined
      );
    } catch (e) {
      showIslandError(u("오류", "Error"), e instanceof Error ? e.message : u("처리하지 못했습니다.", "Could not complete action."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{u("거래가 완료되었나요?", "Was the trade completed?")}</Text>
      {selfConfirmed ? (
        <Text style={styles.meta}>
          {peerConfirmed
            ? u("거래가 완료되었습니다.", "Trade marked complete.")
            : u("완료로 응답했습니다. 상대 확인을 기다려 주세요.", "You confirmed. Waiting for the other party.")}
        </Text>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={[styles.circle, styles.noBtn]}
            disabled={busy}
            onPress={() => void respond("decline")}
            accessibilityLabel={u("미완료", "Not completed")}
          >
            {busy ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="close" size={22} color="#fff" />}
          </Pressable>
          <Pressable
            style={[styles.circle, styles.yesBtn]}
            disabled={busy}
            onPress={() => void respond("confirm")}
            accessibilityLabel={u("완료", "Completed")}
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
