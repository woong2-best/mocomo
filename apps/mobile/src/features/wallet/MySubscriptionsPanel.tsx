import { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cancelSubscription, fetchMySubscriptions } from "@/api/subscriptions";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsd } from "@/lib/money";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";

export function MySubscriptionsPanel() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ creatorId: string; username: string } | null>(
    null
  );

  const query = useQuery({
    queryKey: ["mobile-subscriptions"],
    queryFn: fetchMySubscriptions,
  });

  const subscriptions = query.data?.subscriptions ?? [];

  function handleCancel(creatorId: string, username: string) {
    setCancelConfirm({ creatorId, username });
  }

  function runCancelSubscription() {
    if (!cancelConfirm) return;
    const { creatorId } = cancelConfirm;
    setCancellingId(creatorId);
    setCancelConfirm(null);
    void cancelSubscription(creatorId)
      .then(() => {
        void queryClient.invalidateQueries({ queryKey: ["mobile-subscriptions"] });
        showIslandSuccess(t("m.common.done"), t("m.wallet.auto_renewal_stops_next_month"));
      })
      .catch((e: unknown) => {
        showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.wallet.could_not_cancel"));
      })
      .finally(() => setCancellingId(null));
  }

  if (query.isLoading) {
    return <Text style={styles.empty}>{t("m.wallet.loading_subscriptions")}</Text>;
  }

  if (subscriptions.length === 0) {
    return (
      <Text style={styles.empty}>
        {t("m.wallet.no_active_subscriptions_start_monthly_su")}
      </Text>
    );
  }

  return (
    <View style={styles.list}>
      <Modal
        visible={cancelConfirm !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelConfirm(null)}
      >
        <Pressable style={styles.scrim} onPress={() => setCancelConfirm(null)}>
          <Pressable style={[styles.confirmCard, { borderColor: colors.hairline }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.confirmTitle, { color: colors.text }]}>{t("m.wallet.cancel_next_payment")}</Text>
            <Text style={[styles.confirmBody, { color: colors.textMuted }]}>
              {t("m.wallet.cancel_next_auto_payment_for_username", { username: String(cancelConfirm?.username) })}
            </Text>
            <FolkButton label={t("m.wallet.confirm_cancel")} variant="secondary" onPress={runCancelSubscription} />
            <FolkButton label={t("common.close")} variant="ghost" onPress={() => setCancelConfirm(null)} />
          </Pressable>
        </Pressable>
      </Modal>
      {subscriptions.map((s) => {
        const periodEnd = new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR");
        const statusLabel = s.active
          ? s.cancelAtPeriodEnd
            ? t("m.wallet.cancels_active_until_periodend", { periodEnd: String(periodEnd) })
            : t("m.wallet.next_charge_periodend", { periodEnd: String(periodEnd) })
          : t("m.wallet.expired");

        return (
          <View key={s.id} style={[styles.row, { borderColor: colors.hairline }]}>
            <Pressable
              onPressIn={() =>
                prefetchUserProfile({ username: s.creatorUsername, name: s.creatorName })
              }
              onPress={() => openUserProfile({ username: s.creatorUsername, name: s.creatorName })}
              style={styles.meta}
            >
              <Text style={[styles.username, { color: colors.text }]}>@{s.creatorUsername}</Text>
              <Text style={[styles.detail, { color: colors.textMuted }]}>
                {t("m.wallet.formatusd_mo", { formatUsd: String(formatUsd(s.amount)) })} · {statusLabel}
              </Text>
            </Pressable>
            {s.active && !s.cancelAtPeriodEnd ? (
              <FolkButton
                label={t("m.wallet.cancel_next_payment")}
                variant="secondary"
                onPress={() => void handleCancel(s.creatorId, s.creatorUsername)}
                loading={cancellingId === s.creatorId}
                disabled={cancellingId !== null}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: { gap: spacing.sm },
    row: {
      borderWidth: 1,
      borderRadius: 14,
      padding: spacing.md,
      gap: spacing.sm,
    },
    meta: { gap: 4 },
    username: { fontSize: 15, fontWeight: "800" },
    detail: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
    empty: {
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 19,
      color: colors.textMuted,
    },
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    confirmCard: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.lg,
      gap: spacing.sm,
      backgroundColor: colors.surfaceRaised,
    },
    confirmTitle: { fontSize: 16, fontWeight: "800" },
    confirmBody: { fontSize: 13, fontWeight: "500", lineHeight: 19 },
  });
}
