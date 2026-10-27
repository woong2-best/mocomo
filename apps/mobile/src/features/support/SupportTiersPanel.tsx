import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { fetchSupportTiers } from "@/api/support";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkCard } from "@/ui/FolkCard";
import { OreIcon } from "@/ui/OreIcon";
import { SupportTierBadge } from "@/ui/SupportTierBadge";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { useUserProfileNav } from "@/features/profile/user-profile-nav";

/** Native parity with web `/support/tiers` — embedded in wallet or full screen. */
export function SupportTiersPanel() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { open: openUserProfile, prefetch: prefetchUserProfile } = useUserProfileNav();
  const listRef = useRef<FlatList>(null);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["mobile-support-tiers", selectedTier],
    queryFn: () => fetchSupportTiers(selectedTier),
  });

  const data = query.data;

  if (query.isLoading && !data) {
    return <ActivityIndicator style={{ marginTop: 40 }} color={colors.cobalt} />;
  }

  if (!data) {
    return <Text style={styles.muted}>{t("m.support.could_not_load_tier_info")}</Text>;
  }

  const currentTier = data.tiers.find((tier) => tier.level === data.current.level);
  const heroColor = currentTier?.color ?? colors.cobalt;
  const selectedMeta = data.tiers.find((tier) => tier.level === selectedTier);
  const supportedUsers = data.supportedUsers ?? [];

  return (
    <FlatList
      ref={listRef}
      data={data.tiers}
      keyExtractor={(tier) => tier.level}
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
              {t("m.support.tiers_are_based_on_the_total")}
            </Text>
          </View>

          <FolkCard style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressCaption}>{t("m.support.my_total_tips")}</Text>
              {data.next ? (
                <OreIcon
                  uri={data.tiers.find((tier) => tier.level === data.next!.level)?.iconUrl ?? ""}
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

          {selectedMeta ? (
            <FolkCard style={styles.usersCard}>
              <Text style={[styles.usersTitle, { color: selectedMeta.color }]}>
                {t("m.support.users_supported_at_this_tier", { tier: selectedMeta.label })}
              </Text>
              {query.isFetching && !supportedUsers.length ? (
                <ActivityIndicator color={colors.cobalt} />
              ) : supportedUsers.length === 0 ? (
                <Text style={styles.mutedInline}>{t("m.support.no_users_at_this_tier")}</Text>
              ) : (
                supportedUsers.map((user) => (
                  <Pressable
                    key={user.id}
                    style={styles.userRow}
                    onPressIn={() =>
                      prefetchUserProfile({
                        username: user.username,
                        name: user.name,
                        image: user.image,
                      })
                    }
                    onPress={() =>
                      openUserProfile({
                        username: user.username,
                        name: user.name,
                        image: user.image,
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`@${user.username}`}
                  >
                    <FolkAvatar uri={user.image} name={user.username} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName}>@{user.username}</Text>
                    </View>
                    <Text style={styles.userAmount}>{user.totalAmount.toLocaleString()} MOCO</Text>
                  </Pressable>
                ))
              )}
            </FolkCard>
          ) : null}

          <Text style={styles.sectionLabel}>{t("m.support.all_tiers")}</Text>
          <Text style={styles.sectionHint}>{t("m.support.tap_a_tier_to_see_supported_users")}</Text>
        </>
      }
      renderItem={({ item }) => {
        const active = item.level === (selectedTier ?? data.current.level);
        return (
          <Pressable
            onPress={() => {
              setSelectedTier((prev) => (prev === item.level ? null : item.level));
              listRef.current?.scrollToOffset({ offset: 0, animated: true });
            }}
            style={[styles.tierRow, active && styles.tierRowActive]}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <OreIcon uri={item.iconUrl} size={22} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tierName, { color: active ? item.color : colors.text }]}>
                {item.labelKo}
              </Text>
              <Text style={styles.tierMin}>{item.minAmount.toLocaleString()} MOCO+</Text>
            </View>
            {item.level === data.current.level ? (
              <Text style={[styles.badge, { color: item.color }]}>{t("m.marketplace.current")}</Text>
            ) : null}
          </Pressable>
        );
      }}
    />
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    muted: { textAlign: "center", marginTop: 40, color: colors.textMuted, fontWeight: "600" },
    mutedInline: { color: colors.textMuted, fontWeight: "600", fontSize: 13, lineHeight: 18 },
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
    usersCard: { gap: spacing.sm, marginBottom: spacing.sm },
    usersTitle: { fontSize: 14, fontWeight: "800" },
    userRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    userName: { fontSize: 14, fontWeight: "700", color: colors.text },
    userAmount: { fontSize: 13, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
    sectionLabel: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.textMuted,
      marginBottom: 4,
      paddingHorizontal: 2,
    },
    sectionHint: {
      fontSize: 12,
      fontWeight: "600",
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
