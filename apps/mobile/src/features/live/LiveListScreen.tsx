import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchLiveHub, type LiveListItem } from "@/api/live";
import {
  CATEGORY_POSTER,
  formatViewerCount,
  liveCategoryLabel,
  MOBILE_LIVE_CATEGORIES,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";
import { LiveStreamCard } from "@/features/live/LiveStreamCard";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const ROW_ORDER = ["JUST_CHATTING", "GAME", "IRL", "MUSIC", "LIVE"] as const;

export function LiveListScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<MobileLiveCategoryId>("ALL");
  const pad = spacing.md;
  const cardW = width - pad * 2;

  const query = useQuery({
    queryKey: ["mobile-live-hub", category],
    queryFn: () =>
      fetchLiveHub({ category: category === "ALL" ? undefined : category }),
    staleTime: 25_000,
  });

  const items = query.data?.items ?? [];
  const followed = query.data?.followed ?? [];
  const popular = query.data?.popularCategories ?? [];
  const recommended = query.data?.recommended ?? [];

  const openLive = useCallback(
    (id: string) => navigation.navigate("LiveDetail", { id }),
    [navigation]
  );

  const grouped = useMemo(() => {
    if (category !== "ALL") return null;
    const map = new Map<string, LiveListItem[]>();
    for (const id of ROW_ORDER) map.set(id, []);
    for (const item of items) {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return ROW_ORDER.map((id) => ({
      id,
      label: liveCategoryLabel(id),
      channels: map.get(id) ?? [],
    })).filter((row) => row.channels.length > 0);
  }, [category, items]);

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  return (
    <Screen>
      <AppHeader
        title="라이브"
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable onPress={() => navigation.navigate("LiveGoLive")} hitSlop={8}>
            <Text style={styles.cta}>방송 시작</Text>
          </Pressable>
        }
      />

      {query.isLoading && !query.data ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError && !query.data ? (
        <View style={styles.center}>
          <Text style={styles.error}>라이브 허브를 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 48 }}
          refreshControl={
            <RefreshControl refreshing={query.isFetching && !query.isLoading} onRefresh={onRefresh} />
          }
        >
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="radio" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>라이브 방송</Text>
              <Text style={styles.heroSub}>유튜브 · 트위치 · 치지직 연결 시청</Text>
            </View>
            <Pressable style={styles.heroBtn} onPress={() => navigation.navigate("LiveGoLive")}>
              <Text style={styles.heroBtnText}>시작</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pills}
          >
            {MOBILE_LIVE_CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategory(c.id)}
                  style={[
                    styles.pill,
                    active
                      ? { backgroundColor: colors.terracotta, borderColor: colors.terracotta }
                      : { backgroundColor: colors.muted, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.pillText, { color: active ? "#fff" : colors.text }]}>
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {followed.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>팔로우 중 라이브</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {followed.map((item) => (
                  <LiveStreamCard
                    key={`f-${item.id}`}
                    item={item}
                    cardWidth={Math.min(280, cardW * 0.78)}
                    onPress={() => openLive(item.id)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {popular.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>실시간 인기 카테고리</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                {popular.map((cat) => {
                  const poster = CATEGORY_POSTER[cat.id] ?? CATEGORY_POSTER.LIVE!;
                  return (
                    <Pressable
                      key={cat.id}
                      style={styles.posterCard}
                      onPress={() => setCategory(cat.id as MobileLiveCategoryId)}
                    >
                      <View style={[styles.poster, { backgroundColor: poster.colors[0] }]}>
                        <View
                          style={[
                            styles.posterWash,
                            { backgroundColor: poster.colors[1], opacity: 0.55 },
                          ]}
                        />
                        <Text style={styles.posterLabel}>{liveCategoryLabel(cat.id)}</Text>
                      </View>
                      <Text style={styles.posterTitle} numberOfLines={1}>
                        {liveCategoryLabel(cat.id)}
                      </Text>
                      <Text style={styles.posterSub}>{formatViewerCount(cat.viewerCount)}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {category === "ALL" && grouped ? (
            grouped.length === 0 ? (
              <Text style={styles.empty}>진행 중인 라이브가 없습니다.</Text>
            ) : (
              grouped.map((row) => (
                <View key={row.id} style={styles.section}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>{row.label}</Text>
                    <Pressable onPress={() => setCategory(row.id as MobileLiveCategoryId)}>
                      <Text style={styles.viewAll}>전체 보기</Text>
                    </Pressable>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hRow}>
                    {row.channels.map((item) => (
                      <LiveStreamCard
                        key={item.id}
                        item={item}
                        cardWidth={Math.min(280, cardW * 0.78)}
                        onPress={() => openLive(item.id)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ))
            )
          ) : (
            <View style={[styles.section, { paddingHorizontal: pad }]}>
              <Text style={[styles.sectionTitle, { paddingHorizontal: 0 }]}>
                {liveCategoryLabel(category)}
              </Text>
              {items.length === 0 ? (
                <Text style={[styles.empty, { paddingHorizontal: 0 }]}>
                  이 카테고리에 라이브가 없습니다.
                </Text>
              ) : (
                items.map((item) => (
                  <LiveStreamCard
                    key={item.id}
                    item={item}
                    cardWidth={cardW}
                    onPress={() => openLive(item.id)}
                  />
                ))
              )}
            </View>
          )}

          {recommended.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>맞춤 추천</Text>
              {recommended.slice(0, 8).map((host) => (
                <Pressable
                  key={host.id}
                  style={styles.recRow}
                  onPress={() => navigation.navigate("UserProfile", { username: host.username })}
                >
                  <FolkAvatar uri={host.image} name={host.username} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recName}>@{host.username}</Text>
                    <Text style={styles.recSub}>
                      {host.followerCount.toLocaleString("ko-KR")} 팔로워
                      {host.isPartner ? " · 파트너" : ""}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cta: { fontWeight: "800", color: colors.terracotta, fontSize: 14 },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
    hero: {
      marginHorizontal: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 2,
      borderColor: "rgba(212, 166, 58, 0.28)",
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.terracotta,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: { fontSize: 17, fontWeight: "900", color: colors.cobalt },
    heroSub: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginTop: 2 },
    heroBtn: {
      backgroundColor: colors.terracotta,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    heroBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
    pills: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    pill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    pillText: { fontSize: 12, fontWeight: "700" },
    section: { marginTop: spacing.md },
    sectionHead: {
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
    },
    sectionTitle: {
      paddingHorizontal: spacing.md,
      marginBottom: 10,
      fontSize: 16,
      fontWeight: "800",
      color: colors.text,
    },
    viewAll: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.textMuted,
      marginBottom: 10,
      marginRight: spacing.md,
    },
    hRow: { paddingHorizontal: spacing.md, gap: 12 },
    posterCard: { width: 132 },
    poster: {
      aspectRatio: 3 / 4,
      borderRadius: radii.lg,
      justifyContent: "flex-end",
      padding: 12,
      overflow: "hidden",
    },
    posterWash: {
      ...StyleSheet.absoluteFill,
      top: "35%",
    },
    posterLabel: {
      color: "#fff",
      fontWeight: "900",
      fontSize: 14,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      zIndex: 1,
    },
    posterTitle: {
      marginTop: 8,
      fontSize: 13,
      fontWeight: "700",
      color: colors.text,
    },
    posterSub: { fontSize: 11, color: colors.textMuted, fontWeight: "600", marginTop: 2 },
    empty: {
      paddingHorizontal: spacing.md,
      paddingVertical: 32,
      color: colors.textMuted,
      fontWeight: "600",
      textAlign: "center",
    },
    recRow: {
      marginHorizontal: spacing.md,
      marginBottom: 8,
      padding: 10,
      borderRadius: radii.md,
      backgroundColor: colors.surfaceRaised,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    recName: { fontWeight: "700", color: colors.text, fontSize: 14 },
    recSub: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 2 },
  });
}
