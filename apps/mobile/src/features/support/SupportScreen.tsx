import { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { fetchSupportTiers } from "@/api/support";
import { AppHeader } from "@/ui/AppHeader";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { SupportTierBadge } from "@/ui/SupportTierBadge";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

/** Native parity with web `/support/tiers`. */
export function SupportScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();

  const query = useQuery({
    queryKey: ["mobile-support-tiers"],
    queryFn: fetchSupportTiers,
  });

  const data = query.data;

  return (
    <Screen>
      <AppHeader title="후원 티어" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.cobalt} />
      ) : !data ? (
        <Text style={styles.muted}>티어 정보를 불러오지 못했습니다.</Text>
      ) : (
        <FlatList
          data={data.tiers}
          keyExtractor={(t) => t.level}
          contentContainerStyle={{ padding: spacing.lg, gap: 10 }}
          ListHeaderComponent={
            <FolkCard style={styles.hero}>
              <View style={styles.heroRow}>
                <SupportTierBadge tier={data.current.level} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>{data.current.labelKo}</Text>
                  <Text style={styles.heroSub}>
                    누적 후원 {data.totalSupportSent.toLocaleString()} MOCO
                  </Text>
                  <Text style={styles.progress}>{data.progress.message}</Text>
                </View>
              </View>
              {data.next ? (
                <Text style={styles.next}>
                  다음: {data.next.labelKo} ({data.next.remaining.toLocaleString()} MOCO 남음)
                </Text>
              ) : null}
            </FolkCard>
          }
          renderItem={({ item }) => {
            const active = item.level === data.current.level;
            return (
              <View style={[styles.tierRow, active && styles.tierRowActive]}>
                <Image source={{ uri: item.iconUrl }} style={styles.tierIcon} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.tierName}>{item.labelKo}</Text>
                  <Text style={styles.tierMin}>{item.minAmount.toLocaleString()} MOCO+</Text>
                </View>
                {active ? <Text style={styles.badge}>현재</Text> : null}
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    muted: { textAlign: "center", marginTop: 40, color: colors.textMuted, fontWeight: "600" },
    hero: { gap: spacing.sm, marginBottom: spacing.sm },
    heroRow: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
    heroTitle: { fontSize: 20, fontWeight: "900", color: colors.text },
    heroSub: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
    progress: { fontSize: 12, fontWeight: "700", color: colors.cobalt, marginTop: 6 },
    next: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
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
    tierIcon: { width: 36, height: 36 },
    tierName: { fontWeight: "800", color: colors.text, fontSize: 15 },
    tierMin: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
    badge: { fontSize: 11, fontWeight: "800", color: colors.cobalt },
  });
}
