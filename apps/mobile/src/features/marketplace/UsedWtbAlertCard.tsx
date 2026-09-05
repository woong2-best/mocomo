import { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { createWtbAlert } from "@/api/subculture";
import { ApiError } from "@/api/client";
import { productTypeLabel } from "@/features/marketplace/used-catalog";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function UsedWtbAlertCard({
  workTitle,
  animeSlug,
  productType,
  characterName,
  currency,
  isOwner,
  status,
}: {
  workTitle?: string | null;
  animeSlug?: string | null;
  productType?: string | null;
  characterName?: string | null;
  currency?: string | null;
  isOwner?: boolean;
  status?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const [maxPrice, setMaxPrice] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);

  const create = useMutation({
    mutationFn: () =>
      createWtbAlert({
        workTitle: workTitle ?? undefined,
        animeSlug: animeSlug ?? undefined,
        productType: productType ?? undefined,
        characterName: characterName ?? undefined,
        maxPrice: maxPrice.trim() ? Math.floor(Number(maxPrice) || 0) : undefined,
        currency: currency ?? "krw",
        note: note.trim() || undefined,
      }),
    onSuccess: () => setDone(true),
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body
          ? String((err.body as { error: string }).error)
          : "WTB 등록에 실패했습니다.";
      Alert.alert("WTB", msg);
    },
  });

  if (isOwner || status !== "SELLING") return null;
  if (!workTitle && !animeSlug && !productType) return null;
  if (done) {
    return (
      <View style={styles.card}>
        <Text style={styles.done}>WTB 알림이 등록됐어요.</Text>
      </View>
    );
  }

  const summary = [
    workTitle,
    productType ? productTypeLabel(productType) : null,
    characterName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={styles.card}>
      <Text style={styles.title}>WTB 알림 받기</Text>
      <Text style={styles.hint}>{summary} 조건의 새 글이 올라오면 알려 드려요.</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        placeholder="희망 최대가 (선택)"
        placeholderTextColor={colors.textMuted}
        value={maxPrice}
        onChangeText={setMaxPrice}
      />
      <TextInput
        style={styles.input}
        placeholder="메모 (선택)"
        placeholderTextColor={colors.textMuted}
        value={note}
        onChangeText={setNote}
      />
      <FolkButton
        label="WTB 알림 등록"
        loading={create.isPending}
        onPress={() => create.mutate()}
      />
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginTop: spacing.md,
      padding: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: "rgba(27, 74, 140, 0.25)",
      gap: spacing.sm,
    },
    title: { fontWeight: "800", color: colors.cobalt, fontSize: 14 },
    hint: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 10,
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
      fontWeight: "600",
    },
    done: { fontSize: 13, fontWeight: "700", color: colors.cobalt },
  });
}
