import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchDmInbox, type DmInboxRoom } from "@/api/messages";
import { chatPostShareListPreview } from "@/lib/chat-post-share";
import { floatingTabClearance } from "@/navigation/tab-layout";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
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

export function MessagesInboxScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isTab = route.name === "Messages";
  const bottomPad = isTab ? floatingTabClearance(insets.bottom) : insets.bottom + 24;
  const query = useQuery({
    queryKey: ["mobile-dm-inbox"],
    queryFn: fetchDmInbox,
    staleTime: 90_000,
    placeholderData: (previous) => previous,
  });
  const loading = query.isLoading && !query.data;

  const renderItem = useCallback(
    ({ item }: { item: DmInboxRoom }) => (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() =>
          navigation.navigate("MessageRoom", {
            roomId: item.id,
            title: item.displayName,
          })
        }
      >
        <FolkAvatar uri={item.displayImage} name={item.displayName} size={56} />
        <View style={styles.meta}>
          <View style={styles.nameLine}>
            <Text style={styles.name} numberOfLines={1}>
              {item.displayName}
            </Text>
            <Text style={styles.time}>{relativeTime(item.lastMessageAt)}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {previewText(item.lastMessage)}
          </Text>
        </View>
      </Pressable>
    ),
    [navigation, styles]
  );

  return (
    <Screen safeTop={false}>
      <View style={[styles.header, { paddingTop: isTab ? insets.top + 8 : insets.top + 4 }]}>
        {!isTab ? (
          <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.cobalt} />
          </Pressable>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={styles.headerTitle}>메시지</Text>
        <Pressable
          onPress={() => navigation.navigate("MessagesNew")}
          hitSlop={10}
          style={styles.headerBtn}
          accessibilityLabel="새 메시지"
        >
          <Ionicons name="create-outline" size={22} color={colors.cobalt} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.terracotta} />
        </View>
      ) : query.isError ? (
        <View style={styles.center}>
          <Text style={styles.muted}>메시지를 불러오지 못했습니다.</Text>
          <FolkButton label="다시 시도" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <FlatList
          data={query.data?.rooms ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: bottomPad, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubbles-outline" size={28} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>아직 대화가 없어요.</Text>
              <Text style={styles.muted}>친구에게 첫 메시지를 보내 보세요.</Text>
              <FolkButton label="새 메시지" onPress={() => navigation.navigate("MessagesNew")} />
            </View>
          }
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingBottom: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 22, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
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
    nameLine: { flexDirection: "row", alignItems: "baseline", gap: 8 },
    name: { flex: 1, fontWeight: "700", fontSize: 15, color: colors.text },
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
