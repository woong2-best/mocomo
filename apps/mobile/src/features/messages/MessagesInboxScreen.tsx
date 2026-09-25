import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchDmInbox,
  fetchRoomMessages,
  openDm,
  type DmInboxRoom,
  type MessageUserHit,
} from "@/api/messages";
import {
  followingDmQueryOptions,
  getFollowingDmMemory,
} from "@/api/following-dm-cache";
import {
  getDmInboxMemory,
  saveDmInboxBootstrap,
  saveDmRoomBootstrap,
  dmRoomQueryKey,
} from "@/api/dm-bootstrap-cache";
import { dmRoomIsUnread } from "@/features/messages/useHasUnreadDms";
import { chatPostShareListPreview } from "@/lib/chat-post-share";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

function relativeTime(iso: string | null) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "지금";
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일`;
  if (d < 30) return `${Math.floor(d / 7)}주`;
  return `${Math.floor(d / 30)}달`;
}

function previewText(raw: string) {
  return chatPostShareListPreview(raw) || raw || "대화를 시작해 보세요";
}

function matchScore(user: MessageUserHit, q: string) {
  const username = user.username.toLowerCase();
  const name = (user.name ?? "").toLowerCase();
  if (username === q || name === q) return 3;
  if (username.startsWith(q) || name.startsWith(q)) return 2;
  if (username.includes(q) || name.includes(q)) return 1;
  return 0;
}

function filterFollowingUsers(following: MessageUserHit[], rawQ: string): MessageUserHit[] {
  const q = rawQ.trim().toLowerCase();
  if (!q) return following;

  return following
    .map((u) => ({ u, score: matchScore(u, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.u.username.localeCompare(b.u.username))
    .map((x) => x.u);
}

type Props = {
  presentation?: "tab" | "stack" | "drawer";
  onRequestClose?: () => void;
};

export function MessagesInboxScreen({ presentation, onRequestClose }: Props = {}) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const mode = presentation ?? (route.name === "Messages" ? "tab" : "stack");
  const isDrawer = mode === "drawer";
  const isTab = mode === "tab";
  const bottomPad = isTab ? floatingTabClearance(insets.bottom) : insets.bottom + 24;

  const [sendQ, setSendQ] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["mobile-dm-inbox"],
    queryFn: fetchDmInbox,
    staleTime: 90_000,
    gcTime: 30 * 60_000,
    placeholderData: (previous) => previous ?? getDmInboxMemory() ?? undefined,
  });
  const loading = query.isLoading && !query.data;

  const followingQuery = useQuery({
    ...followingDmQueryOptions(),
    placeholderData: () => getFollowingDmMemory() ?? undefined,
  });

  const rooms = useMemo(
    () => (query.data?.rooms ?? []).filter((r) => r.lastMessageAt != null),
    [query.data?.rooms]
  );

  const followingUsers = followingQuery.data?.users ?? getFollowingDmMemory()?.users;
  const pickerUsers = useMemo(
    () => filterFollowingUsers(followingUsers ?? [], sendQ),
    [followingUsers, sendQ]
  );
  const followingPending = followingUsers == null && followingQuery.isPending;

  useEffect(() => {
    if (!query.data?.rooms) return;
    const withMessages = query.data.rooms.filter((r) => r.lastMessageAt != null);
    void saveDmInboxBootstrap(withMessages);
  }, [query.data]);

  const prefetchRoom = useCallback(
    (roomId: string) => {
      void queryClient.prefetchQuery({
        queryKey: dmRoomQueryKey(roomId),
        queryFn: async () => {
          const page = await fetchRoomMessages(roomId);
          await saveDmRoomBootstrap(roomId, page);
          return page;
        },
        staleTime: 30_000,
      });
    },
    [queryClient]
  );

  const startDm = useCallback(
    async (user: MessageUserHit) => {
      const title = user.name?.trim() || user.username;
      setOpeningId(user.id);
      try {
        const res = await openDm(user.id);
        setPickerOpen(false);
        setSendQ("");
        onRequestClose?.();
        navigation.navigate("MessageRoom", { roomId: res.roomId, title });
      } catch {
        // keep picker open
      } finally {
        setOpeningId(null);
      }
    },
    [navigation, onRequestClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: DmInboxRoom }) => {
      const unread = dmRoomIsUnread(item);
      return (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPressIn={() => prefetchRoom(item.id)}
          accessibilityLabel={unread ? `${item.displayName}, 읽지 않음` : item.displayName}
          onPress={() => {
            onRequestClose?.();
            navigation.navigate("MessageRoom", {
              roomId: item.id,
              title: item.displayName,
            });
          }}
        >
          <FolkAvatar uri={item.displayImage} name={item.displayName} size={56} />
          <View style={styles.meta}>
            <View style={styles.nameLine}>
              <View style={styles.nameCluster}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                {unread ? <View style={styles.unreadDot} /> : null}
              </View>
              <Text style={styles.time}>{relativeTime(item.lastMessageAt)}</Text>
            </View>
            <Text style={styles.preview} numberOfLines={1}>
              {previewText(item.lastMessage)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [navigation, onRequestClose, prefetchRoom, styles]
  );

  const renderPickerItem = useCallback(
    ({ item }: { item: MessageUserHit }) => {
      const label = item.name?.trim() || item.username;
      const busy = openingId === item.id;
      return (
        <Pressable
          style={({ pressed }) => [styles.pickerRow, pressed && styles.rowPressed]}
          disabled={busy}
          onPress={() => void startDm(item)}
        >
          <FolkAvatar uri={item.image} name={label} size={44} />
          <View style={styles.meta}>
            <Text style={styles.pickerName} numberOfLines={1}>
              {label}
            </Text>
            <Text style={styles.pickerUsername} numberOfLines={1}>
              @{item.username}
            </Text>
          </View>
          {busy ? <ActivityIndicator color={colors.terracotta} /> : null}
        </Pressable>
      );
    },
    [colors.terracotta, openingId, startDm, styles]
  );

  const body = (
    <>
      <View style={[styles.header, { paddingTop: isDrawer ? 4 : isTab ? insets.top + 8 : insets.top + 4 }]}>
        {isDrawer ? null : !isTab ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.cobalt} />
          </Pressable>
        ) : null}

        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={sendQ}
            onChangeText={(text) => {
              setSendQ(text);
              if (!pickerOpen) setPickerOpen(true);
            }}
            onFocus={() => setPickerOpen(true)}
            placeholder="Send message"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <Pressable
            style={styles.searchBtn}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <Ionicons name="search" size={18} color="#fff" />
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            onRequestClose?.();
            navigation.navigate("ChatSettings");
          }}
          hitSlop={8}
          style={styles.settingsBtn}
          accessibilityRole="button"
          accessibilityLabel="채팅 설정"
        >
          <Ionicons name="settings-outline" size={22} color={colors.brand} />
        </Pressable>
      </View>

      {pickerOpen ? (
        <View style={styles.pickerPanel}>
          {followingPending ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={colors.terracotta} />
          ) : (
            <FlatList
              data={pickerUsers}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.pickerList}
              ListEmptyComponent={
                <Text style={styles.pickerEmpty}>
                  {sendQ.trim()
                    ? "검색 결과가 없습니다."
                    : followingQuery.isError
                      ? "팔로우 목록을 불러오지 못했습니다."
                      : "팔로우한 사용자가 없습니다."}
                </Text>
              }
              renderItem={renderPickerItem}
            />
          )}
          <Pressable
            style={styles.pickerDismiss}
            onPress={() => {
              setPickerOpen(false);
              setSendQ("");
            }}
          >
            <Text style={styles.pickerDismissText}>닫기</Text>
          </Pressable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      ) : query.isError && !query.data ? (
        <View style={styles.center}>
          <Text style={styles.muted}>메시지를 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>아직 대화가 없어요.</Text>
              <Text style={styles.muted}>위에서 친구를 찾아 첫 메시지를 보내 보세요.</Text>
            </View>
          }
        />
      )}
    </>
  );

  if (isDrawer) {
    return <View style={styles.drawerRoot}>{body}</View>;
  }

  return <Screen safeTop={false}>{body}</Screen>;
}

function createThemedStyles(colors: ThemeColors, isDark: boolean) {
  const drawerBg = isDark ? "#0F1524" : colors.background;

  return StyleSheet.create({
    drawerRoot: { flex: 1, backgroundColor: drawerBg },
    header: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: spacing.md,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: drawerBg,
    },
    headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    searchBar: {
      flex: 1,
      flexDirection: "row",
      alignItems: "stretch",
      minHeight: 44,
      borderRadius: radii.md,
      borderWidth: 1.5,
      borderColor: "rgba(120, 150, 220, 0.28)",
      backgroundColor: colors.searchFill,
      overflow: "hidden",
    },
    searchInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
    searchBtn: {
      width: 48,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.terracotta,
    },
    settingsBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    pickerPanel: {
      maxHeight: 280,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    pickerList: { maxHeight: 232 },
    pickerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    pickerName: { fontWeight: "700", fontSize: 15, color: colors.text },
    pickerUsername: { marginTop: 2, fontSize: 13, color: colors.textMuted },
    pickerEmpty: {
      textAlign: "center",
      color: colors.textMuted,
      fontWeight: "600",
      paddingVertical: 24,
      paddingHorizontal: spacing.md,
    },
    pickerDismiss: {
      alignItems: "center",
      paddingVertical: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.hairline,
    },
    pickerDismissText: { fontWeight: "700", color: colors.brand, fontSize: 13 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.hairline,
    },
    rowPressed: { backgroundColor: colors.muted },
    meta: { flex: 1, minWidth: 0 },
    nameLine: { flexDirection: "row", alignItems: "center", gap: 8 },
    nameCluster: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    name: { flexShrink: 1, fontWeight: "700", fontSize: 15, color: colors.text },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#3B82F6",
    },
    time: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
    preview: { marginTop: 3, color: colors.textMuted, fontSize: 14, fontWeight: "400" },
    muted: {
      color: colors.textMuted,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 20,
    },
    empty: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.xl,
      paddingTop: 80,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },
    emptyTitle: { fontWeight: "800", color: colors.text, fontSize: 16 },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.sm,
      padding: spacing.lg,
    },
  });
}
