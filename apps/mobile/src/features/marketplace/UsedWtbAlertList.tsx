import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { showIslandInfo } from "@/ui/IslandToast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { removeWtbAlert, type WtbAlertItem } from "@/api/subculture";
import { formatUsedPrice, productTypeLabel, type UsedUiText } from "@/features/marketplace/used-catalog";
import { ApiError } from "@/api/client";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

function alertSummary(a: WtbAlertItem, u: UsedUiText): string {
  return [a.workTitle, a.productType ? productTypeLabel(a.productType, u) : null, a.characterName]
    .filter(Boolean)
    .join(" · ");
}

export function UsedWtbAlertList({ items }: { items: WtbAlertItem[] }) {
  const { u } = useI18n();
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
          : u("알림 해제에 실패했습니다.", "Could not remove alert.");
      showIslandInfo("WTB", msg);
    },
  });

  if (items.length === 0) {
    return (
      <Text style={styles.muted}>
        {u(
          "등록된 WTB 알림이 없어요. 상품 상세에서 조건을 등록할 수 있어요.",
          "No WTB alerts yet. Add criteria from a listing detail page."
        )}
      </Text>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {items.map((a) => (
        <View key={a.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={2}>
              {alertSummary(a, u) || u("조건 알림", "Alert criteria")}
            </Text>
            {a.maxPrice != null && a.maxPrice > 0 ? (
              <Text style={styles.sub}>
                {u("희망 최대", "Max")} {formatUsedPrice(a.maxPrice, a.currency, u)}
              </Text>
            ) : null}
            {a.note ? <Text style={styles.sub} numberOfLines={2}>{a.note}</Text> : null}
          </View>
          <Pressable
            style={styles.removeBtn}
            disabled={remove.isPending}
            onPress={() => remove.mutate(a.id)}
          >
            <Text style={styles.removeText}>{u("해제", "Remove")}</Text>
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
