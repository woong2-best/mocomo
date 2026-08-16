import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchEventDetail, joinEvent } from "@/api/events";
import { ApiError } from "@/api/client";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

export function EventDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "EventDetail">>();
  const queryClient = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ["mobile-events", route.params.id],
    queryFn: () => fetchEventDetail(route.params.id),
  });
  const item = query.data?.item;

  const join = useMutation({
    mutationFn: () => joinEvent(route.params.id),
    onSuccess: async () => {
      setMsg("참여 완료");
      await queryClient.invalidateQueries({ queryKey: ["mobile-events", route.params.id] });
    },
    onError: (err) => {
      const text =
        err instanceof ApiError &&
        err.body &&
        typeof err.body === "object" &&
        "error" in err.body &&
        typeof (err.body as { error: unknown }).error === "string"
          ? (err.body as { error: string }).error
          : "참여에 실패했습니다.";
      setMsg(text);
    },
  });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>뒤로</Text>
        </Pressable>
        <Text style={styles.heading}>이벤트</Text>
      </View>
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : query.isError || !item ? (
        <Text style={styles.error}>이벤트를 불러오지 못했습니다.</Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.hero}
              cachePolicy={IMAGE_CACHE_POLICY}
              transition={0}
            />
          ) : (
            <View style={[styles.hero, styles.heroFallback]} />
          )}
          <View style={styles.body}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>
              {new Date(item.startsAt).toLocaleString("ko-KR")} –{" "}
              {new Date(item.endsAt).toLocaleString("ko-KR")}
            </Text>
            <Text style={styles.sub}>{item.participantCount}명 참여</Text>
            {item.prize ? <Text style={styles.prize}>상품: {item.prize}</Text> : null}
            <Text style={styles.desc}>{item.description}</Text>
            {!item.joined ? (
              <Pressable
                style={[styles.btn, join.isPending && styles.btnDisabled]}
                disabled={join.isPending}
                onPress={() => join.mutate()}
              >
                <Text style={styles.btnText}>참여하기</Text>
              </Pressable>
            ) : (
              <Text style={styles.joined}>참여 중</Text>
            )}
            {msg ? <Text style={styles.note}>{msg}</Text> : null}
          </View>
        </ScrollView>
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
  heading: { fontSize: 20, fontWeight: "800", color: colors.text },
  hero: { width: "100%", aspectRatio: 1, backgroundColor: colors.border },
  heroFallback: {},
  body: { padding: spacing.md, backgroundColor: colors.surface },
  title: { fontSize: 22, fontWeight: "800", color: colors.text },
  sub: { marginTop: 6, color: colors.textMuted },
  prize: { marginTop: 8, fontWeight: "700", color: colors.text },
  desc: { marginTop: spacing.md, color: colors.text, lineHeight: 22 },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700" },
  joined: { marginTop: spacing.md, fontWeight: "700", color: colors.text },
  note: { marginTop: spacing.sm, color: colors.textMuted },
  error: { color: colors.danger, padding: spacing.lg },
});
}

