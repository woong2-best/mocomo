import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  fetchNotifications,
  markNotificationsRead,
  type NotificationItem,
} from "@/api/notifications";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const QUERY_KEY = ["mobile-notifications"] as const;

export function ActivityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchNotifications,
  });

  const markOne = useMutation({
    mutationFn: (id: string) => markNotificationsRead({ id }),
    onSuccess: (res, id) => {
      queryClient.setQueryData(QUERY_KEY, (prev: typeof query.data) => {
        if (!prev) return prev;
        return {
          unread: res.unread,
          notifications: prev.notifications.map((row) =>
            row.id === id ? { ...row, read: true } : row
          ),
        };
      });
    },
  });

  const markAll = useMutation({
    mutationFn: () => markNotificationsRead({ all: true }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const unread = query.data?.unread ?? 0;

  return (
    <Screen>
      <AppHeader
        title="알림"
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          unread > 0 ? (
            <Pressable onPress={() => markAll.mutate()} hitSlop={10} disabled={markAll.isPending}>
              <Text style={styles.markAll}>모두 읽음</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={10}>
              <Ionicons name="settings-outline" size={22} color={colors.cobalt} />
            </Pressable>
          )
        }
      />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.error}>알림을 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.notifications ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor={colors.terracotta}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.iconBubble, styles.iconMuted]}>
                <Ionicons name="notifications-outline" size={26} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>새 알림이 없습니다</Text>
              <Text style={styles.emptyBody}>
                댓글, QnA 답변, 맘찍, 인용, 재게시, 팔로우 라이브, 상품 맘찍, 경매 소식이 여기에 모입니다.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <AlarmRow
              item={item}
              styles={styles}
              colors={colors}
              onPress={() => {
                if (!item.read) markOne.mutate(item.id);
                openAlarm(item, navigation);
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}

function AlarmRow({
  item,
  styles,
  colors,
  onPress,
}: {
  item: NotificationItem;
  styles: ReturnType<typeof createThemedStyles>;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const visual = alarmVisual(item.type);
  return (
    <Pressable style={[styles.row, !item.read && styles.rowUnread]} onPress={onPress}>
      <View style={[styles.iconBubble, { backgroundColor: visual.wash }]}>
        <Ionicons name={visual.icon} size={18} color={visual.ink} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleLine}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {item.createdAt ? <Text style={styles.time}>{formatAlarmTime(item.createdAt)}</Text> : null}
        </View>
        {item.body ? (
          <Text style={styles.rowBody} numberOfLines={3}>
            {item.body}
          </Text>
        ) : null}
        {item.actor?.username ? <Text style={styles.actor}>@{item.actor.username}</Text> : null}
      </View>
      {!item.read ? <View style={[styles.dot, { backgroundColor: colors.terracotta }]} /> : null}
    </Pressable>
  );
}

function openAlarm(
  item: NotificationItem,
  navigation: NativeStackNavigationProp<RootStackParamList>
) {
  const link = item.link ?? "";
  const postId = link.match(/\/post\/([^/?#]+)/)?.[1];
  if (postId) {
    navigation.navigate("PostDetail", { id: postId });
    return;
  }
  const marketId = link.match(/\/market\/([^/?#]+)/)?.[1];
  if (marketId && marketId !== "orders" && marketId !== "my" && marketId !== "verify") {
    navigation.navigate(item.type?.startsWith("used_auction") ? "AuctionDetail" : "MarketplaceDetail", {
      id: marketId,
    });
    return;
  }
  const liveId = link.match(/\/voice\/([^/?#]+)/)?.[1];
  if (liveId) navigation.navigate("LiveDetail", { id: liveId });
}

function alarmVisual(type: string | undefined): {
  icon: keyof typeof Ionicons.glyphMap;
  ink: string;
  wash: string;
} {
  if (type?.startsWith("used_auction")) {
    return { icon: "hammer", ink: "#8A5A12", wash: "rgba(212, 166, 58, 0.22)" };
  }
  switch (type) {
    case "like":
    case "listing_like":
      return { icon: "heart", ink: "#C5522A", wash: "rgba(197, 82, 42, 0.14)" };
    case "comment":
    case "comment_reply":
      return { icon: "chatbubble", ink: "#1B4A8C", wash: "rgba(27, 74, 140, 0.12)" };
    case "qna_answer":
      return { icon: "help-circle", ink: "#8A5A12", wash: "rgba(212, 166, 58, 0.2)" };
    case "quote":
      return { icon: "chatbox-ellipses", ink: "#1B4A8C", wash: "rgba(27, 74, 140, 0.12)" };
    case "repost":
      return { icon: "repeat", ink: "#2E5C3A", wash: "rgba(46, 92, 58, 0.14)" };
    case "live":
      return { icon: "radio", ink: "#B33A1F", wash: "rgba(179, 58, 31, 0.12)" };
    default:
      return { icon: "notifications", ink: "#1B4A8C", wash: "rgba(27, 74, 140, 0.1)" };
  }
}

function formatAlarmTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일`;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    list: { padding: spacing.md, paddingBottom: 48, flexGrow: 1 },
    center: { padding: spacing.lg, alignItems: "center", gap: 12 },
    markAll: { color: colors.cobalt, fontWeight: "800", fontSize: 13 },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      backgroundColor: colors.surfaceRaised,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.16)",
      ...shadows.folkSm,
    },
    rowUnread: {
      borderColor: "rgba(197, 82, 42, 0.45)",
      backgroundColor: "rgba(197, 82, 42, 0.06)",
    },
    iconBubble: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    iconMuted: { backgroundColor: colors.muted },
    copy: { flex: 1, minWidth: 0 },
    titleLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    rowTitle: { flex: 1, fontWeight: "800", color: colors.cobalt, fontSize: 15 },
    time: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
    rowBody: { color: colors.text, lineHeight: 20, fontWeight: "600", marginTop: 4 },
    actor: { marginTop: 4, color: colors.textMuted, fontWeight: "700", fontSize: 12 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    empty: { alignItems: "center", paddingTop: 56, paddingHorizontal: 28 },
    emptyTitle: { marginTop: 14, fontWeight: "900", fontSize: 17, color: colors.cobalt },
    emptyBody: {
      marginTop: 8,
      textAlign: "center",
      color: colors.textMuted,
      lineHeight: 20,
      fontWeight: "600",
    },
    error: { color: colors.danger, fontWeight: "600" },
  });
}
