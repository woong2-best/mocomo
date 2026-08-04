import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLiveList, type LiveListItem } from "@/api/live";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function LiveListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isTab = route.name === "Live";
  const bottomPad = isTab ? floatingTabClearance(insets.bottom) : insets.bottom + 24;
  const query = useQuery({ queryKey: ["mobile-live"], queryFn: fetchLiveList });

  const renderItem = useCallback(
    ({ item }: { item: LiveListItem }) => (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("LiveDetail", { id: item.id })}
      >
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={styles.thumb}
            cachePolicy={IMAGE_CACHE_POLICY}
            transition={0}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]} />
        )}
        <View style={styles.meta}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            @{item.host.username} · {item.viewerCount} watching
          </Text>
        </View>
      </Pressable>
    ),
    [navigation]
  );

  return (
    <Screen>
      <AppHeader
        title="라이브"
        leftLabel={isTab ? undefined : "뒤로"}
        onLeftPress={isTab ? undefined : () => navigation.goBack()}
        rightSlot={
          <Pressable onPress={() => navigation.navigate("LiveGoLive")} hitSlop={8}>
            <Text style={styles.broadcast}>연결</Text>
          </Pressable>
        }
      />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>라이브 목록을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: bottomPad, paddingTop: spacing.sm }}
          ListEmptyComponent={<Text style={styles.muted}>진행 중인 라이브가 없습니다.</Text>}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    backgroundColor: colors.surfaceRaised,
    ...shadows.folkSm,
  },
  thumb: {
    width: 96,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.muted,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.12)",
  },
  thumbFallback: {},
  meta: { flex: 1, marginLeft: spacing.sm, justifyContent: "center" },
  title: { fontWeight: "800", color: colors.cobalt, marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  muted: { color: colors.textMuted, padding: spacing.lg, fontWeight: "600" },
  error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
  center: { padding: spacing.lg, alignItems: "center" },
  broadcast: { fontWeight: "800", color: colors.terracotta },
});
}

