import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchSupportTiers } from "@/api/support";
import { FolkCard } from "@/ui/FolkCard";
import { OreIcon } from "@/ui/OreIcon";
import { SupportTierBadge } from "@/ui/SupportTierBadge";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

/** Native parity with web `/support/tiers` — embedded in wallet or full screen. */
export function SupportTiersPanel() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const query = useQuery({
    queryKey: ["mobile-support-tiers"],
    queryFn: fetchSupportTiers,
  });

  const data = query.data;

  if (query.isLoading) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.cobalt} />;
  }

  if (!data) {
    return <Text style={styles.muted}>티어 정보를 불러오지 못했습니다.</Text>;
  }

  const currentTier = data.tiers.find((t) => t.level === data.current.level);
  const heroColor = currentTier?.color ?? colors.cobalt;

  return (
    <FlatList
      data={data.tiers}
      keyExtractor={(t) => t.level}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 40, gap: 10 }}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <View style={styles.heroCenter}>
            {currentTier ? (
              <OreIcon uri={currentTier.iconUrl} size={120} haloColor={heroColor} shadow="lg" />
            ) : (
              <SupportTierBadge tier={data.current.level} />
            )}
            <Text style={[styles.heroLabel, { color: heroColor }]}>{data.current.label}</Text>
            <Text style={styles.heroLabelKo}>{data.current.labelKo}</Text>
            <Text style={styles.heroThreshold}>{data.current.minAmount.toLocaleString()} MOCO+</Text>
            <Text style={styles.heroHint}>
              MOCO 구매가 아닌, 다른 사용자에게 후원을 완료한 누적 MOCO 기준 등급입니다.
            </Text>
          </View>

          <FolkCard style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressCaption}>내 누적 후원</Text>
              {data.next ? (
                <OreIcon
                  uri={data.tiers.find((t) => t.level === data.next!.level)?.iconUrl ?? ""}
                  size={32}
                />
              ) : currentTier ? (
                <OreIcon uri={currentTier.iconUrl} size={32} />
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.round(Math.min(1, Math.max(0, data.progress.progress)) * 100)}%`,
                    backgroundColor: heroColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progress}>{data.progress.message}</Text>
          </FolkCard>

          <Text style={styles.sectionLabel}>전체 등급</Text>
        </>
      }
      renderItem={({ item }) => {
        const active = item.level === data.current.level;
        return (
          <View style={[styles.tierRow, active && styles.tierRowActive]}>
            <OreIcon uri={item.iconUrl} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierName, { color: active ? item.color : colors.text }]}>
                {item.labelKo}
              </Text>
              <Text style={styles.tierMin}>{item.minAmount.toLocaleString()} MOCO+</Text>
            </View>
            {active ? <Text style={[styles.badge, { color: item.color }]}>현재</Text> : null}
          </View>
        );
      }}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    muted: { textAlign: "center", marginTop: 40, color: colors.textMuted, fontWeight: "600" },
    heroCenter: { alignItems: "center", paddingBottom: spacing.md, gap: 4, marginBottom: spacing.sm },
    heroLabel: { fontSize: 24, fontWeight: "900", marginTop: 4 },
    heroLabelKo: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    heroThreshold: { fontSize: 16, fontWeight: "800", color: colors.text, marginTop: 8 },
    heroHint: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 18,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.sm,
    },
    progressCard: { gap: spacing.sm, marginBottom: spacing.sm },
    progressHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    progressCaption: { fontSize: 14, fontWeight: "600", color: colors.textMuted },
    progress: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "center" },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.hairline,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 999 },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.textMuted,
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    tierRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    tierRowActive: { borderColor: colors.cobalt, backgroundColor: `${colors.cobalt}12` },
    tierName: { fontWeight: "800", fontSize: 15 },
    tierMin: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
    badge: { fontSize: 11, fontWeight: "800" },
  });
}
