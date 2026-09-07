import { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { cancelSubscription, fetchMySubscriptions } from "@/api/subscriptions";
import type { RootStackParamList } from "@/navigation/types";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatUsd } from "@/lib/money";

export function MySubscriptionsPanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["mobile-subscriptions"],
    queryFn: fetchMySubscriptions,
  });

  const subscriptions = query.data?.subscriptions ?? [];

  async function handleCancel(creatorId: string, username: string) {
    Alert.alert(
      "다음 달 결제 취소",
      `@${username} 정기 후원의 다음 달 자동 결제를 취소할까요? 이미 처리된 후원금은 환불되지 않습니다.`,
      [
        { text: "닫기", style: "cancel" },
        {
          text: "취소하기",
          style: "destructive",
          onPress: () => {
            setCancellingId(creatorId);
            void cancelSubscription(creatorId)
              .then(() => {
                void queryClient.invalidateQueries({ queryKey: ["mobile-subscriptions"] });
                Alert.alert("완료", "다음 달부터 자동 결제되지 않습니다.");
              })
              .catch((e: unknown) => {
                Alert.alert("오류", e instanceof Error ? e.message : "취소에 실패했습니다.");
              })
              .finally(() => setCancellingId(null));
          },
        },
      ]
    );
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
              onPress={() => navigation.navigate("UserProfile", { username: s.creatorUsername })}
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
                variant="outline"
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
  });
}
