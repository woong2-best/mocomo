import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchEventsList, type EventListItem } from "@/api/events";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const EVENT_CATEGORY_LINE = "팬아트 · 코스프레 · 굿즈 · 오프라인 · 버츄얼";

const FILTER_TAGS = [
  { id: "all", label: "전체", hash: null },
  { id: "fanart", label: "팬아트", hash: "#팬아트" },
  { id: "cosplay", label: "코스프레", hash: "#코스프레" },
  { id: "goods", label: "굿즈", hash: "#굿즈" },
  { id: "virtual", label: "버츄얼", hash: "#버츄얼" },
  { id: "meetup", label: "행사", hash: "#행사" },
  { id: "other", label: "이벤트", hash: "#이벤트" },
] as const;

const PURPLE = "#A855F7";
const PURPLE_LIGHT = "#C084FC";

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("ko-KR", opts)} – ${e.toLocaleDateString("ko-KR", opts)}`;
}

function eventDday(endsAt: string): string {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return "—";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = Math.round(
    (startOfEnd.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff === 0) return "D-Day";
  if (diff < 0) return "종료";
  return `D-${diff}`;
}

export function EventsListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({ queryKey: ["mobile-events"], queryFn: fetchEventsList });
  const [filter, setFilter] = useState<string>("all");

  const items = query.data?.items ?? [];
  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((e) => e.type === filter)),
    [items, filter]
  );

  const featured = useMemo(() => {
    const withImage = items.filter((e) => e.imageUrl);
    const pool = withImage.length > 0 ? withImage : items;
    if (pool.length === 0) return null;
    return [...pool].sort((a, b) => b.participantCount - a.participantCount)[0];
  }, [items]);

  const onRegisterEvent = useCallback(() => {
    void Linking.openURL("https://mocomo.net/events/new");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: EventListItem }) => (
      <Pressable
        style={styles.card}
        onPress={() => navigation.navigate("EventDetail", { id: item.id })}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            transition={0}
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImageFallback]}>
            <Ionicons name="sparkles" size={28} color={PURPLE} />
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardMeta}>
            <Text style={styles.dday}>{eventDday(item.endsAt)}</Text>
            <Text style={styles.participants}>{item.participantCount}명 참여</Text>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.cardSub}>{formatRange(item.startsAt, item.endsAt)}</Text>
        </View>
      </Pressable>
    ),
    [navigation, styles]
  );

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>이벤트</Text>
          <Text style={styles.categoryLine}>{EVENT_CATEGORY_LINE}</Text>
        </View>
        <Pressable style={styles.registerBtn} onPress={onRegisterEvent}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.registerBtnText}>이벤트 등록</Text>
        </Pressable>
      </View>

      {featured && (
        <Pressable
          style={styles.featuredWrap}
          onPress={() => navigation.navigate("EventDetail", { id: featured.id })}
        >
          <View style={styles.featuredLabel}>
            <Ionicons name="sparkles" size={14} color={PURPLE_LIGHT} />
            <Text style={styles.featuredLabelText}>Featured Event</Text>
          </View>
          <View style={styles.featuredCard}>
            {featured.imageUrl ? (
              <Image
                source={{ uri: featured.imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                cachePolicy={IMAGE_CACHE_POLICY}
                transition={0}
              />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.featuredFallback]} />
            )}
            <View style={styles.featuredOverlay} />
            <View style={styles.featuredContent}>
              <Text style={styles.featuredType}>
                {FILTER_TAGS.find((t) => t.id === featured.type)?.label ?? featured.type}
              </Text>
              <Text style={styles.featuredTitle} numberOfLines={2}>
                {featured.title}
              </Text>
            </View>
          </View>
        </Pressable>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_TAGS.map((tag) => {
          const active = filter === tag.id;
          return (
            <Pressable
              key={tag.id}
              onPress={() => setFilter(tag.id)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {tag.hash ?? tag.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const emptyComponent = (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="sparkles" size={28} color={PURPLE} />
      </View>
      <Text style={styles.emptyTitle}>✨ 아직 진행 중인 이벤트가 없습니다. ✨</Text>
      <Text style={styles.emptySub}>첫 번째 이벤트를 등록해보세요.</Text>
      <Pressable style={styles.registerBtnLarge} onPress={onRegisterEvent}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.registerBtnText}>이벤트 등록</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <View style={{ width: 40 }} />
      </View>

      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={PURPLE} />
      ) : query.isError && !query.data ? (
        <Text style={styles.error}>이벤트 목록을 불러오지 못했습니다.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingHorizontal: spacing.md }}
        />
      )}
    </View>
  );
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    back: { color: colors.accent, fontWeight: "600", fontSize: 16 },
    headerBlock: { paddingTop: spacing.xs, paddingBottom: spacing.md, gap: spacing.md },
    titleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
    pageTitle: { fontSize: 28, fontWeight: "800", color: colors.text, letterSpacing: -0.5 },
    categoryLine: { marginTop: 6, fontSize: 13, color: colors.textMuted },
    registerBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: PURPLE,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    registerBtnLarge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: PURPLE,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      marginTop: spacing.lg,
    },
    registerBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    featuredWrap: { gap: 8 },
    featuredLabel: { flexDirection: "row", alignItems: "center", gap: 6 },
    featuredLabelText: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    featuredCard: {
      height: 180,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: isDark ? "rgba(168,85,247,0.25)" : colors.border,
    },
    featuredFallback: {
      backgroundColor: isDark ? "rgba(168,85,247,0.12)" : colors.surface,
    },
    featuredOverlay: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    featuredContent: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      padding: 16,
    },
    featuredType: { fontSize: 11, fontWeight: "600", color: PURPLE_LIGHT },
    featuredTitle: { marginTop: 4, fontSize: 18, fontWeight: "700", color: "#fff" },
    filterRow: { gap: 8, paddingVertical: 4 },
    filterPill: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? colors.surface : colors.surfaceRaised,
    },
    filterPillActive: {
      backgroundColor: "rgba(168, 85, 247, 0.15)",
      borderWidth: 1,
      borderColor: "rgba(168, 85, 247, 0.4)",
    },
    filterText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    filterTextActive: { color: isDark ? PURPLE_LIGHT : "#9333EA" },
    gridRow: { gap: spacing.sm, marginBottom: spacing.sm },
    card: {
      flex: 1,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardImage: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
    cardImageFallback: { alignItems: "center", justifyContent: "center" },
    cardBody: { padding: 10, gap: 4 },
    cardMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    dday: { fontSize: 11, fontWeight: "800", color: PURPLE },
    participants: { fontSize: 11, color: colors.textMuted },
    cardTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
    cardSub: { fontSize: 12, color: colors.textMuted },
    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      paddingHorizontal: 24,
      marginTop: spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.border,
      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : colors.surface,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: "rgba(168, 85, 247, 0.1)",
      borderWidth: 1,
      borderColor: "rgba(168, 85, 247, 0.25)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing.md,
    },
    emptyTitle: { fontSize: 16, fontWeight: "600", color: colors.text, textAlign: "center" },
    emptySub: { marginTop: 8, fontSize: 14, color: colors.textMuted, textAlign: "center" },
    error: { color: colors.danger, padding: spacing.lg },
  });
}
