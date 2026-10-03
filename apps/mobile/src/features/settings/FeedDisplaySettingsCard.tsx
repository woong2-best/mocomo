import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { clearFeedBootstrap } from "@/api/feed-bootstrap-cache";
import { patchMe } from "@/api/discovery";
import { ApiError } from "@/api/client";
import { FolkCard } from "@/ui/FolkCard";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { translate } from "@/i18n/runtime";

export function FeedDisplaySettingsCard() {
  const { t } = useI18n();
  const { user, refreshMe } = useAuth();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [feedRecommendationEnabled, setFeedRecommendationEnabled] = useState(true);
  const [showLikeCounts, setShowLikeCounts] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prefs = user?.preferences;
    setFeedRecommendationEnabled(prefs?.feedRecommendationEnabled !== false);
    setShowLikeCounts(prefs?.showLikeCounts !== false);
    setLoading(false);
  }, [user?.preferences?.feedRecommendationEnabled, user?.preferences?.showLikeCounts]);

  const savePref = useCallback(
    async (patch: { feedRecommendationEnabled?: boolean; showLikeCounts?: boolean }) => {
      try {
        await patchMe(patch);
        if (patch.feedRecommendationEnabled !== undefined) {
          await clearFeedBootstrap();
          await queryClient.invalidateQueries({ queryKey: ["mobile-feed"] });
        }
        await refreshMe();
      } catch (e) {
        showIslandError(t("m.common.error"), errorMessage(e));
        throw e;
      }
    },
    [queryClient, refreshMe]
  );

  const onToggleRecommendation = useCallback(
    async (enabled: boolean) => {
      const prev = feedRecommendationEnabled;
      setFeedRecommendationEnabled(enabled);
      try {
        await savePref({ feedRecommendationEnabled: enabled });
      } catch {
        setFeedRecommendationEnabled(prev);
      }
    },
    [feedRecommendationEnabled, savePref]
  );

  const onToggleLikeCounts = useCallback(
    async (visible: boolean) => {
      const prev = showLikeCounts;
      setShowLikeCounts(visible);
      try {
        await savePref({ showLikeCounts: visible });
      } catch {
        setShowLikeCounts(prev);
      }
    },
    [showLikeCounts, savePref]
  );

  if (!user?.id) return null;

  return (
    <FolkCard>
      <Text style={styles.cardTitle}>{t("m.settings.feed_display")}</Text>
      <Text style={styles.cardDesc}>
        {t("m.settings.turning_off_recommendations_switches_to_")}
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{t("m.settings.recommendations")}</Text>
          <Text style={styles.rowSub}>
            {feedRecommendationEnabled ? t("m.settings.engagement_based_for_you") : t("m.settings.latest_first")}
          </Text>
        </View>
        <Switch
          value={feedRecommendationEnabled}
          disabled={loading}
          onValueChange={(v) => void onToggleRecommendation(v)}
          trackColor={{ false: colors.border, true: colors.cobalt }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{t("m.settings.show_like_counts")}</Text>
          <Text style={styles.rowSub}>{showLikeCounts ? t("m.settings.showing") : t("m.settings.hidden")}</Text>
        </View>
        <Switch
          value={showLikeCounts}
          disabled={loading}
          onValueChange={(v) => void onToggleLikeCounts(v)}
          trackColor={{ false: colors.border, true: colors.cobalt }}
          thumbColor="#fff"
        />
      </View>
    </FolkCard>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return translate("m.settings.could_not_save_settings");
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: 8,
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    rowSub: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  });
}
