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
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchEventsList, type EventListItem } from "@/api/events";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("ko-KR", opts)} – ${e.toLocaleDateString("ko-KR", opts)}`;
}

export function EventsListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({ queryKey: ["mobile-events"], queryFn: fetchEventsList });

  const renderItem = useCallback(
    ({ item }: { item: EventListItem }) => (
      <Pressable
        style={styles.row}
        onPress={() => navigation.navigate("EventDetail", { id: item.id })}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
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
          <Text style={styles.sub}>{formatRange(item.startsAt, item.endsAt)}</Text>
          <Text style={styles.sub}>{item.participantCount}명 참여</Text>
        </View>
      </Pressable>
    ),
    [navigation]
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading}>이벤트</Text>
        <Pressable onPress={() => navigation.navigate("EventsMap")} hitSlop={8}>
          <Text style={styles.mapLink}>지도</Text>
        </Pressable>
      </View>
      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : query.isError && !query.data ? (
        <Text style={styles.error}>이벤트 목록을 불러오지 못했습니다.</Text>
      ) : (
        <FlatList
          data={query.data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={<Text style={styles.muted}>진행 예정 이벤트가 없습니다.</Text>}
        />
      )}
    </View>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { color: colors.accent, fontWeight: "600" },
  heading: { flex: 1, fontSize: 20, fontWeight: "800", color: colors.text },
  mapLink: { color: colors.accent, fontWeight: "700" },
  row: {
    flexDirection: "row",
    padding: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.border },
  thumbFallback: {},
  meta: { flex: 1, marginLeft: spacing.sm, justifyContent: "center" },
  title: { fontWeight: "700", color: colors.text, marginBottom: 4 },
  sub: { color: colors.textMuted, fontSize: 13 },
  muted: { color: colors.textMuted, padding: spacing.lg },
  error: { color: colors.danger, padding: spacing.lg },
});
}

