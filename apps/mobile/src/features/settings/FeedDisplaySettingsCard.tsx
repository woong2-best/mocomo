import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { clearFeedBootstrap } from "@/api/feed-bootstrap-cache";
import { patchMe } from "@/api/discovery";
import { ApiError } from "@/api/client";
import { FolkCard } from "@/ui/FolkCard";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function FeedDisplaySettingsCard() {
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
        Alert.alert("오류", errorMessage(e));
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
      <Text style={styles.cardTitle}>피드 · 표시</Text>
      <Text style={styles.cardDesc}>
        추천 알고리즘을 끄면 최신순 피드로 전환됩니다. 좋아요 수는 본인·타인 게시물 모두에서
        숨길 수 있습니다.
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>추천 알고리즘</Text>
          <Text style={styles.rowSub}>
            {feedRecommendationEnabled ? "참여도 기반 For You" : "최신순"}
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
          <Text style={styles.rowTitle}>좋아요 수 표시</Text>
          <Text style={styles.rowSub}>{showLikeCounts ? "표시 중" : "숨김"}</Text>
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
  return "설정을 저장하지 못했습니다.";
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
