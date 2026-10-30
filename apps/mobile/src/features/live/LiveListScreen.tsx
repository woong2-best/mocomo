import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchLiveAvatarHosts, fetchLiveHub, type LiveListItem } from "@/api/live";
import { coerceViewerCount, type MobileLiveCategoryId } from "@/features/live/live-categories";
import { ensureR18LiveAccess } from "@/features/live/ensure-r18-access";
import { LiveBrowseHero, LiveBrowseRow } from "@/features/live/LiveBrowseRow";
import { AiOfficialChannelCard, AiStageHero } from "@/features/live/ai/AiOfficialChannelCard";
import { fetchAiStages, stageForCharacter } from "@/features/live/ai/ai-speak";
import { hydrateVrmStills } from "@/features/live/ai/vrm-still-cache";
import { VrmStillWarmer } from "@/features/live/ai/VrmStillWarmer";
import { hostFromAvatarMap, IDOL_LIVES } from "@/features/live/ai/idol-lives";
import { LiveGlassSearch } from "@/features/live/LiveGlassSearch";
import { LiveSlantTabs } from "@/features/live/LiveSlantTabs";
import { sanitizeLiveListItems } from "@/features/live/live-hub-sanitize";
import { FolkButton } from "@/ui/FolkButton";
import { ScreenErrorBoundary } from "@/ui/ScreenErrorBoundary";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";
import { liveUi } from "@/features/live/live-ui";

const LIVE_HUB_DISPLAY_MAX = 8;

export function LiveListScreen() {
  const { t, locale } = useI18n();
  const copy = useMemo(() => liveUi(t), [t]);
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [category, setCategory] = useState<MobileLiveCategoryId>("ALL");
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    void hydrateVrmStills();
  }, []);

  const stagesQuery = useQuery({
    queryKey: ["mobile-ai-stages"],
    queryFn: fetchAiStages,
    staleTime: 5 * 60_000,
  });
  const zelieStage = stageForCharacter("zelie", stagesQuery.data);
  const warmStages = useMemo(
    () => ["zelie", "cleo", "mio", "nangnang"].map((id) => stageForCharacter(id, stagesQuery.data)),
    [stagesQuery.data]
  );
  const avatarsQuery = useQuery({
    queryKey: ["mobile-live-avatars"],
    queryFn: fetchLiveAvatarHosts,
    staleTime: 30_000,
  });

  const query = useInfiniteQuery({
    queryKey: ["mobile-live-hub", category],
    queryFn: ({ pageParam }) =>
      fetchLiveHub({
        category: category === "ALL" ? undefined : category,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.nextOffset : undefined),
    staleTime: 25_000,
    retry: 2,
  });

  useEffect(() => {
    const key = ["mobile-live-hub", category] as const;
    const cached = queryClient.getQueryData(key);
    if (cached != null && typeof cached === "object" && !("pages" in cached)) {
      queryClient.removeQueries({ queryKey: key });
    }
  }, [category, queryClient]);

  const items = useMemo(
    () => sanitizeLiveListItems(query.data?.pages.flatMap((p) => p.items)),
    [query.data?.pages]
  );

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => coerceViewerCount(b.viewerCount) - coerceViewerCount(a.viewerCount)
      ),
    [items]
  );

  const searchNorm = searchQ.trim().toLowerCase();

  const visibleItems = useMemo(() => {
    const filtered = !searchNorm
      ? sortedItems
      : sortedItems.filter((item) => {
          const nick = item.host?.username?.toLowerCase() ?? "";
          const title = item.title.toLowerCase();
          return nick.includes(searchNorm) || title.includes(searchNorm);
        });
    return filtered.slice(0, LIVE_HUB_DISPLAY_MAX);
  }, [sortedItems, searchNorm]);

  const hasHubPages = (query.data?.pages?.length ?? 0) > 0;
  const waitingFirst = query.isPending && !hasHubPages;
  const showAiHero = !searchNorm && (category === "ALL" || category === "JUST_CHATTING");
  const hero = showAiHero ? null : (visibleItems[0] ?? null);
  const rows = showAiHero ? visibleItems : hero ? visibleItems.slice(1) : visibleItems;
  const featured = showAiHero || !!hero;
  const avatarHosts = avatarsQuery.data?.hosts ?? query.data?.pages[0]?.avatarHosts;
  const zelieHost = hostFromAvatarMap(avatarHosts, "zelie", "zelie", t("m.live.ai_host_name"));

  const openLive = useCallback(
    (id: string) => navigation.navigate("LiveDetail", { id }),
    [navigation]
  );

  const openProfile = useCallback(
    (username: string, name?: string | null, image?: string | null) => {
      const handle = username.trim();
      if (!handle) return;
      navigation.navigate("UserProfile", { username: handle, name, image });
    },
    [navigation]
  );

  const onRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  const selectCategory = useCallback((id: MobileLiveCategoryId) => {
    void (async () => {
      if (id !== "ALL") {
        const ok = await ensureR18LiveAccess(id, locale);
        if (!ok) return;
      }
      setCategory(id);
    })();
  }, [locale]);

  const searchWidth = Math.max(160, width - insets.left - insets.right - 64);

  const renderItem = useCallback(
    ({ item }: { item: LiveListItem }) => (
      <LiveBrowseRow
        item={item}
        onPress={() => openLive(item.id)}
        onPressHost={() => openProfile(item.host?.username, item.host?.username, item.host?.image)}
      />
    ),
    [openLive, openProfile]
  );

  return (
    <ScreenErrorBoundary label={copy.feature} onRetry={onRefresh}>
      <View style={styles.root}>
        <View
          pointerEvents="box-none"
          style={[styles.chrome, { paddingTop: insets.top + 6 }]}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.backHit}
            accessibilityLabel={copy.back}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>
          <LiveGlassSearch value={searchQ} onChangeText={setSearchQ} expandedWidth={searchWidth} />
        </View>

        {query.isError && !hasHubPages ? (
          <View style={[styles.fill, { paddingTop: insets.top + 48 }]}>
            <LiveSlantTabs active={category} onSelect={selectCategory} />
            <View style={styles.center}>
              <Text style={styles.error}>{copy.loadHubError}</Text>
              <FolkButton label={copy.retry} onPress={() => void query.refetch()} />
            </View>
          </View>
        ) : (
          <FlashList
            data={hasHubPages ? rows : []}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            maintainVisibleContentPosition={{ disabled: true }}
            ListHeaderComponent={
              <View
                style={{
                  paddingTop: featured ? 0 : insets.top + 48,
                  backgroundColor: "#000",
                }}
              >
                {showAiHero ? (
                  <AiStageHero
                    hint={t("m.live.no_messages_yet_say_hello")}
                    stage={zelieStage}
                    host={zelieHost.name}
                    hostUsername={zelieHost.username}
                    hostImage={zelieHost.image}
                    onPress={() => navigation.navigate("MocoLive")}
                    onPressHost={() => openProfile(zelieHost.username, zelieHost.name, zelieHost.image)}
                  />
                ) : hero ? (
                  <LiveBrowseHero item={hero} onPress={() => openLive(hero.id)} />
                ) : null}
                <LiveSlantTabs active={category} onSelect={selectCategory} />
              </View>
            }
            style={{ backgroundColor: "#000" }}
            contentContainerStyle={{
              paddingBottom: insets.bottom + 28,
              backgroundColor: "#000",
            }}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (searchNorm || sortedItems.length >= LIVE_HUB_DISPLAY_MAX) return;
              if (query.hasNextPage && !query.isFetchingNextPage) {
                void query.fetchNextPage();
              }
            }}
            ListEmptyComponent={
              waitingFirst && !showAiHero ? (
                <ActivityIndicator style={{ marginTop: 48 }} color={colors.terracotta} />
              ) : searchNorm && !hero && !showAiHero ? (
                <Text style={styles.empty}>{copy.noSearchResults}</Text>
              ) : !waitingFirst && !searchNorm && !hero && !showAiHero ? (
                <Text style={styles.empty}>{copy.noLiveCurrently}</Text>
              ) : null
            }
            ListFooterComponent={
              <View>
                {showAiHero ? (
                  <>
                    {IDOL_LIVES.map((idol) => {
                      const host = hostFromAvatarMap(
                        avatarHosts,
                        idol.avatarId,
                        idol.username,
                        t(idol.nameKey)
                      );
                      return (
                        <AiOfficialChannelCard
                          key={idol.id}
                          accent={idol.accent}
                          stage={stageForCharacter(idol.id, stagesQuery.data)}
                          title={t(idol.titleKey)}
                          host={host.name}
                          hostUsername={host.username}
                          hostImage={host.image}
                          sub={t(idol.roleKey)}
                          onPress={() => navigation.navigate("IdolLive", { member: idol.id })}
                          onPressHost={() => openProfile(host.username, host.name, host.image)}
                        />
                      );
                    })}
                  </>
                ) : null}
                {query.isFetchingNextPage ? (
                  <ActivityIndicator style={{ marginVertical: 16 }} color={colors.terracotta} />
                ) : null}
              </View>
            }
          />
        )}
        {showAiHero ? <VrmStillWarmer stages={warmStages} /> : null}
      </View>
    </ScreenErrorBoundary>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: "#000" },
    fill: { flex: 1, backgroundColor: "#000" },
    chrome: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 6,
      paddingBottom: 8,
    },
    backHit: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600", marginBottom: 12 },
    empty: {
      color: "#9A9A9A",
      textAlign: "center",
      marginTop: 28,
      paddingHorizontal: 24,
      fontSize: 14,
      fontWeight: "600",
    },
  });
}
