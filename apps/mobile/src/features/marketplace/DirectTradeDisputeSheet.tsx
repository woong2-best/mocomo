import { useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDirectTrades } from "@/api/direct-trade";
import type { DirectTradeView } from "@/api/messages";
import { DirectTradeCard } from "@/features/marketplace/DirectTradeCard";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function DirectTradeDisputeSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["direct-trades"],
    queryFn: fetchDirectTrades,
    enabled: visible,
  });
  const trades = query.data?.trades ?? [];
  const selected = trades.find((trade) => trade.id === selectedId) ?? null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.handle} />
          <View style={styles.head}>
            {selected ? (
              <Pressable onPress={() => setSelectedId(null)} hitSlop={8}>
                <Text style={styles.back}>목록</Text>
              </Pressable>
            ) : (
              <Text style={styles.headTitle}>분쟁</Text>
            )}
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.back}>닫기</Text>
            </Pressable>
          </View>
          {query.isLoading ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginTop: spacing.lg }} />
          ) : query.isError ? (
            <Text style={styles.empty}>분쟁 정보를 불러오지 못했습니다.</Text>
          ) : selected ? (
            <ScrollView contentContainerStyle={styles.detail}>
              <DirectTradeCard
                view={selected}
                onUpdated={(next: DirectTradeView) => {
                  client.setQueryData<{ trades: DirectTradeView[] }>(["direct-trades"], (prev) => {
                    if (!prev) return { trades: [next] };
                    return { trades: prev.trades.map((trade) => (trade.id === next.id ? next : trade)) };
                  });
                }}
              />
            </ScrollView>
          ) : trades.length === 0 ? (
            <Text style={styles.empty}>진행 중인 직거래가 없습니다.</Text>
          ) : (
            <ScrollView>
              {trades.map((trade) => (
                <Pressable key={trade.id} style={styles.item} onPress={() => setSelectedId(trade.id)}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {trade.listingTitle}
                  </Text>
                  <Text style={styles.itemMeta}>@{trade.counterpartUsername}</Text>
                  <Text style={styles.itemMeta}>
                    {trade.tradeStatusLabel} · {trade.disputeStatusLabel} · {trade.depositStatusLabel}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      maxHeight: "86%",
      minHeight: 280,
      backgroundColor: colors.background,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      paddingBottom: spacing.lg,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginTop: spacing.sm,
    },
    head: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    headTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
    back: { color: colors.brand, fontWeight: "700" },
    empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xl },
    item: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    itemTitle: { color: colors.text, fontSize: 16, fontWeight: "700" },
    itemMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    detail: { paddingBottom: spacing.xl },
  });
}
