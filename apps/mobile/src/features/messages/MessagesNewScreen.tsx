import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { openDm, searchMessageUsers } from "@/api/messages";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function MessagesNewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [q, setQ] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["mobile-message-user-search", q],
    queryFn: () => searchMessageUsers(q.trim()),
    enabled: q.trim().length >= 1,
  });

  async function startDm(userId: string, title: string) {
    setOpeningId(userId);
    try {
      const res = await openDm(userId);
      navigation.replace("MessageRoom", { roomId: res.roomId, title });
    } catch {
      setOpeningId(null);
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={colors.cobalt} />
        </Pressable>
        <Text style={styles.title}>새 메시지</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.search}
          value={q}
          onChangeText={setQ}
          placeholder="사용자 검색"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      {query.isFetching ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.terracotta} />
      ) : (
        <FlatList
          data={query.data?.users ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            q.trim() ? (
              <Text style={styles.empty}>검색 결과가 없습니다.</Text>
            ) : (
              <Text style={styles.empty}>보낼 사람을 검색하세요.</Text>
            )
          }
          renderItem={({ item }) => {
            const label = item.name?.trim() || item.username;
            const busy = openingId === item.id;
            return (
              <Pressable
                style={styles.row}
                disabled={busy}
                onPress={() => void startDm(item.id, label)}
              >
                <FolkAvatar uri={item.image} name={label} size={44} />
                <View style={styles.meta}>
                  <Text style={styles.name}>{label}</Text>
                  <Text style={styles.username}>@{item.username}</Text>
                </View>
                {busy ? <ActivityIndicator color={colors.terracotta} /> : null}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    back: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    title: { fontSize: 17, fontWeight: "800", color: colors.cobalt },
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      margin: spacing.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    search: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    meta: { flex: 1, minWidth: 0 },
    name: { fontWeight: "700", color: colors.cobalt },
    username: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
    empty: { textAlign: "center", color: colors.textMuted, marginTop: 40, fontWeight: "600" },
  });
}
