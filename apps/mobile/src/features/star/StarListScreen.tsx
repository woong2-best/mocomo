import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import {
  clearAllStarBookmarks,
  fetchStarHub,
  type StarHubCreator,
} from "@/api/discovery";
import type { FeedPost } from "@/api/feed";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const GRID_GAP = 2;
const GRID_COLS = 3;

function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return null;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pickCover(post: FeedPost) {
  const media = post.media?.[0];
  if (!media?.url) return null;
  return {
    url: media.posterUrl?.trim() || media.url,
    type: media.type,
    duration: media.duration,
  };
}

export function StarListScreen() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const { width: screenW } = useWindowDimensions();
  const cellSize = Math.floor((screenW - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const query = useQuery({
    queryKey: ["mobile-star-hub", creatorId],
    queryFn: () => fetchStarHub(creatorId),
  });

  const onClearAll = useCallback(() => {
    const total = query.data?.total ?? 0;
    if (total <= 0) return;
    Alert.alert(
      "전체 삭제",
      "STAR에 저장한 게시물 기록을 모두 삭제할까요? 북마크만 지워지며 게시물 자체는 삭제되지 않습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "전체 삭제",
          style: "destructive",
          onPress: () => {
            setClearing(true);
            void clearAllStarBookmarks()
              .then(() => {
                setCreatorId(null);
                void queryClient.invalidateQueries({ queryKey: ["mobile-star-hub"] });
              })
              .finally(() => setClearing(false));
          },
        },
      ]
    );
  }, [query.data?.total, queryClient]);

  const renderCreator = useCallback(
    (creator: StarHubCreator | "all") => {
      const active = creator === "all" ? creatorId === null : creatorId === creator.id;
      return (
        <Pressable
          key={creator === "all" ? "all" : creator.id}
          style={styles.creatorChip}
          onPress={() => setCreatorId(creator === "all" ? null : creator.id)}
        >
          {creator === "all" ? (
            <View style={[styles.creatorAvatarWrap, active && styles.creatorAllActive]}>
              <Ionicons
                name="star"
                size={22}
                color={active ? colors.textOnAccent : colors.brand}
              />
            </View>
          ) : (
            <View style={[styles.creatorAvatarRing, active && styles.creatorRingActive]}>
              <FolkAvatar uri={creator.image} name={creator.name || creator.username} size={52} framed={false} />
            </View>
          )}
          <Text style={[styles.creatorLabel, active && styles.creatorLabelActive]} numberOfLines={1}>
            {creator === "all" ? "전체" : creator.name || creator.username}
          </Text>
        </Pressable>
      );
    },
    [colors.brand, colors.textOnAccent, creatorId, styles]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeedPost }) => {
      const cover = pickCover(item);
      const isVideo = cover?.type === "VIDEO" || item.postType === "VIDEO";
      const duration = isVideo ? formatDuration(cover?.duration) : null;

      return (
        <Pressable
          style={{ width: cellSize, height: cellSize, marginBottom: GRID_GAP }}
          onPress={() => navigation.navigate("PostDetail", { id: item.id })}
        >
          {cover?.url ? (
            <Image
              source={{ uri: cover.url }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.cellFallback]}>
              <Text style={styles.cellFallbackText} numberOfLines={3}>
                {item.title || item.content || "게시물"}
              </Text>
            </View>
          )}
          {isVideo ? (
            <View style={styles.videoBadge}>
              <Ionicons name="play" size={14} color="#fff" />
            </View>
          ) : null}
          {duration ? <Text style={styles.durationBadge}>{duration}</Text> : null}
        </Pressable>
      );
    },
    [cellSize, navigation, styles]
  );

  const creators = query.data?.creators ?? [];
  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;

  return (
    <Screen>
      <AppHeader
        title="STAR"
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable
            onPress={onClearAll}
            disabled={clearing || total <= 0}
            hitSlop={8}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            {clearing ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <Text
                style={[
                  styles.clearAll,
                  total <= 0 && styles.clearAllDisabled,
                ]}
              >
                전체 삭제하기
              </Text>
            )}
          </Pressable>
        }
      />

      {creators.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.creatorRow}
        >
          {renderCreator("all")}
          {creators.map((c) => renderCreator(c))}
        </ScrollView>
      ) : null}

      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>STAR 목록을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={GRID_COLS}
          columnWrapperStyle={{ gap: GRID_GAP }}
          renderItem={renderItem}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.muted}>
              {creatorId
                ? "이 크리에이터의 STAR 저장 게시물이 없습니다."
                : "저장한 STAR가 없습니다."}
            </Text>
          }
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  const ring = isDark ? colors.terracotta : colors.brand;
  return StyleSheet.create({
    clearAll: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.danger,
    },
    clearAllDisabled: { opacity: 0.35 },
    creatorRow: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
      alignItems: "flex-start",
    },
    creatorChip: {
      width: 68,
      alignItems: "center",
      gap: 6,
    },
    creatorAvatarWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.muted,
      borderWidth: 2,
      borderColor: colors.border,
    },
    creatorAvatarRing: {
      borderRadius: 30,
      borderWidth: 2,
      borderColor: colors.border,
      padding: 1,
    },
    creatorAllActive: {
      borderColor: ring,
      backgroundColor: isDark ? colors.terracotta : colors.brand,
    },
    creatorRingActive: {
      borderColor: ring,
    },
    creatorLabel: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.textMuted,
      maxWidth: 68,
      textAlign: "center",
    },
    creatorLabelActive: {
      color: colors.text,
      fontWeight: "800",
    },
    grid: {
      paddingBottom: 40,
      gap: GRID_GAP,
    },
    cellFallback: {
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
    },
    cellFallbackText: {
      color: colors.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textAlign: "center",
    },
    videoBadge: {
      position: "absolute",
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 6,
      backgroundColor: "rgba(0,0,0,0.72)",
      alignItems: "center",
      justifyContent: "center",
    },
    durationBadge: {
      position: "absolute",
      bottom: 6,
      left: 6,
      color: "#fff",
      fontSize: 10,
      fontWeight: "800",
      backgroundColor: "rgba(0,0,0,0.72)",
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: radii.sm,
      overflow: "hidden",
    },
    muted: {
      color: colors.textMuted,
      padding: spacing.lg,
      fontWeight: "600",
      textAlign: "center",
    },
    center: { padding: spacing.lg, alignItems: "center", gap: spacing.sm },
    error: { color: colors.danger, fontWeight: "700" },
  });
}
