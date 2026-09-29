import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchAnimeHistory, restoreAnimeHistory } from "@/api/discovery";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function formatStamp(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function AnimeHistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "AnimeHistory">>();
  const queryClient = useQueryClient();
  const slug = route.params.slug;

  const query = useQuery({
    queryKey: ["mobile-anime-history", slug],
    queryFn: () => fetchAnimeHistory(slug),
  });

  const restore = useMutation({
    mutationFn: (revisionId: string) => restoreAnimeHistory(slug, revisionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["mobile-anime-detail", slug] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-anime-history", slug] });
      showIslandSuccess("복구 완료", "선택한 버전으로 되돌렸습니다.");
      navigation.navigate("AnimeDetail", { slug });
    },
    onError: (e) => {
      showIslandError("복구 실패", e instanceof Error ? e.message : "복구하지 못했습니다.");
    },
  });

  const entries = query.data?.entries ?? [];

  return (
    <Screen>
      <AppHeader
        title="수정 기록"
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
      />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>수정 기록을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.subtitle}>{query.data?.anime.title}</Text>
          <Text style={styles.hint}>시간 순 · 유저 아이디 · 날짜</Text>
          {entries.map((r, index) => (
            <View key={r.id} style={styles.row}>
              <View style={styles.meta}>
                <Text style={styles.user}>
                  {index + 1}. @{r.username}
                </Text>
                <Text style={styles.when}>{formatStamp(r.createdAt)}</Text>
                <Text style={styles.summary}>{r.summary || "내용 수정"}</Text>
              </View>
              {r.restorable ? (
                <Pressable
                  disabled={restore.isPending}
                  onPress={() =>
                    Alert.alert("이 버전으로 복구", "문서를 이 시점으로 되돌릴까요?", [
                      { text: "취소", style: "cancel" },
                      { text: "복구", onPress: () => restore.mutate(r.id) },
                    ])
                  }
                  style={styles.restore}
                >
                  <Text style={styles.restoreText}>복구</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 40,
      gap: 10,
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: "600",
    },
    hint: {
      color: colors.textMuted,
      fontSize: 12,
      marginBottom: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
    },
    meta: { flex: 1, minWidth: 0, gap: 2 },
    user: { color: colors.text, fontWeight: "800", fontSize: 14 },
    when: { color: colors.textMuted, fontSize: 12, fontVariant: ["tabular-nums"] },
    summary: { color: colors.textMuted, fontSize: 12 },
    restore: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    restoreText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
    center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700" },
  });
}
