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

export function MySubscriptionsPanel() {
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
        showIslandSuccess("완료", "다음 달부터 자동 결제되지 않습니다.");
      })
      .catch((e: unknown) => {
        showIslandError("오류", e instanceof Error ? e.message : "취소에 실패했습니다.");
      })
      .finally(() => setCancellingId(null));
  }

  if (query.isLoading) {
    return <Text style={styles.empty}>정기 후원 목록을 불러오는 중…</Text>;
  }

  if (subscriptions.length === 0) {
    return (
      <Text style={styles.empty}>
        활성 정기 후원이 없습니다. 크리에이터 프로필에서 월 정기 후원을 시작할 수 있습니다.
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
            <Text style={[styles.confirmTitle, { color: colors.text }]}>다음 달 결제 취소</Text>
            <Text style={[styles.confirmBody, { color: colors.textMuted }]}>
              @{cancelConfirm?.username} 정기 후원의 다음 달 자동 결제를 취소할까요? 이미 처리된 후원금은
              환불되지 않습니다.
            </Text>
            <FolkButton label="취소하기" variant="secondary" onPress={runCancelSubscription} />
            <FolkButton label="닫기" variant="ghost" onPress={() => setCancelConfirm(null)} />
          </Pressable>
        </Pressable>
      </Modal>
      {subscriptions.map((s) => {
        const periodEnd = new Date(s.currentPeriodEnd).toLocaleDateString("ko-KR");
        const statusLabel = s.active
          ? s.cancelAtPeriodEnd
            ? `해지 예정 (${periodEnd}까지 이용)`
            : `다음 결제 ${periodEnd}`
          : "만료됨";

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
                {formatUsd(s.amount)}/월 · {statusLabel}
              </Text>
            </Pressable>
            {s.active && !s.cancelAtPeriodEnd ? (
              <FolkButton
                label="다음 달 결제 취소"
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
