import { useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { fetchNotifications, type NotificationItem } from "@/api/notifications";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function ActivityScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const query = useQuery({
    queryKey: ["mobile-notifications"],
    queryFn: fetchNotifications,
  });

  return (
    <Screen>
      <AppHeader
        title="알림"
        leftLabel="뒤로"
        onLeftPress={() => navigation.goBack()}
        rightSlot={
          <Pressable onPress={() => navigation.navigate("Settings")} hitSlop={10}>
            <Ionicons name="settings-outline" size={22} color={colors.cobalt} />
          </Pressable>
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
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.muted}>새 알림이 없습니다.</Text>}
          ListHeaderComponent={
            typeof query.data?.unread === "number" && query.data.unread > 0 ? (
              <Text style={styles.unread}>읽지 않음 {query.data.unread}</Text>
            ) : null
          }
          renderItem={({ item }: { item: NotificationItem }) => (
            <View style={[styles.row, !item.read && styles.rowUnread]}>
              <Text style={styles.rowTitle}>{item.title}</Text>
              {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
            </View>
          )}
        />
      )}
    </Screen>
  );
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
  center: { padding: spacing.lg, alignItems: "center", gap: 12 },
  unread: {
    fontWeight: "800",
    color: colors.terracotta,
    marginBottom: spacing.sm,
  },
  row: {
    backgroundColor: colors.surfaceRaised,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: "rgba(27, 74, 140, 0.2)",
    ...shadows.folkSm,
  },
  rowUnread: {
    borderColor: "rgba(197, 82, 42, 0.45)",
    backgroundColor: "rgba(197, 82, 42, 0.06)",
  },
  rowTitle: { fontWeight: "800", color: colors.cobalt, marginBottom: 4 },
  rowBody: { color: colors.textMuted, lineHeight: 20, fontWeight: "600" },
  muted: { color: colors.textMuted, marginTop: spacing.lg, fontWeight: "600" },
  error: { color: colors.danger, fontWeight: "600" },
});
}

