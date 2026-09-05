import { useMemo } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeWtbAlert, type WtbAlertItem } from "@/api/subculture";
import { formatUsedPrice, productTypeLabel } from "@/features/marketplace/used-catalog";
import { ApiError } from "@/api/client";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

function alertSummary(a: WtbAlertItem): string {
  return [a.workTitle, a.productType ? productTypeLabel(a.productType) : null, a.characterName]
    .filter(Boolean)
    .join(" · ");
}

export function UsedWtbAlertList({ items }: { items: WtbAlertItem[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: (id: string) => removeWtbAlert(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-wtb-alerts"] });
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body
          ? String((err.body as { error: string }).error)
          : "알림 해제에 실패했습니다.";
      Alert.alert("WTB", msg);
    },
  });

  if (items.length === 0) {
    return (
      <Text style={styles.muted}>
        등록된 WTB 알림이 없어요. 상품 상세에서 조건을 등록할 수 있어요.
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((a) => (
        <View key={a.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {alertSummary(a) || "조건 알림"}
            </Text>
            {a.maxPrice != null && a.maxPrice > 0 ? (
              <Text style={styles.sub}>
                희망 최대 {formatUsedPrice(a.maxPrice, a.currency)}
              </Text>
            ) : null}
            {a.note ? <Text style={styles.sub} numberOfLines={2}>{a.note}</Text> : null}
          </View>
          <Pressable
            style={styles.removeBtn}
            disabled={remove.isPending}
            onPress={() => remove.mutate(a.id)}
          >
            <Text style={styles.removeText}>해제</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: 8,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: "rgba(27, 74, 140, 0.18)",
      backgroundColor: colors.surfaceRaised,
    },
    title: { fontWeight: "700", color: colors.text, fontSize: 13 },
    sub: { marginTop: 2, fontSize: 11, color: colors.textMuted },
    removeBtn: {
      alignSelf: "center",
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    removeText: { fontSize: 12, fontWeight: "700", color: colors.textMuted },
    muted: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  });
}
