import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/auth/AuthContext";
import { patchMe } from "@/api/discovery";
import { actOnFollowRequest, fetchFollowRequests } from "@/api/social";
import { ApiError } from "@/api/client";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { FolkCard } from "@/ui/FolkCard";
import { showIslandError, showIslandToast } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function PostsLockSettingsCard() {
  const { user, refreshMe } = useAuth();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [locked, setLocked] = useState(Boolean(user?.postsLocked));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLocked(Boolean(user?.postsLocked));
  }, [user?.postsLocked]);

  const requests = useQuery({
    queryKey: ["mobile-follow-requests"],
    queryFn: fetchFollowRequests,
    enabled: Boolean(user?.id),
  });

  const select = useCallback(
    async (next: boolean) => {
      if (next === locked || busy) return;
      setBusy(true);
      try {
        await patchMe({ postsLocked: next });
        setLocked(next);
        await refreshMe();
        await queryClient.invalidateQueries({ queryKey: ["mobile-follow-requests"] });
        showIslandToast("Saved", next ? "계정을 잠갔습니다." : "계정을 공개했습니다.");
      } catch (e) {
        showIslandError("오류", errorMessage(e));
      } finally {
        setBusy(false);
      }
    },
    [busy, locked, queryClient, refreshMe]
  );

  const act = useCallback(
    async (requesterId: string, action: "approve" | "reject") => {
      try {
        await actOnFollowRequest(requesterId, action);
        await queryClient.invalidateQueries({ queryKey: ["mobile-follow-requests"] });
        await refreshMe();
      } catch (e) {
        showIslandError("오류", errorMessage(e));
      }
    },
    [queryClient, refreshMe]
  );

  if (!user?.id) return null;

  const incoming = requests.data?.requests ?? [];

  return (
    <FolkCard>
      <Text style={styles.cardTitle}>게시글 잠금</Text>
      <Text style={styles.cardDesc}>
        계정을 잠그면 승인된 팔로워만 게시물을 볼 수 있습니다. 이미 팔로우한 사람은 그대로 볼 수
        있고, 새 팔로우는 요청이 됩니다.
      </Text>

      <View style={styles.options}>
        <Pressable
          disabled={busy}
          onPress={() => void select(false)}
          style={[
            styles.option,
            {
              borderColor: !locked ? colors.terracotta : colors.border,
              backgroundColor: !locked ? `${colors.terracotta}12` : colors.surfaceRaised,
            },
          ]}
        >
          <View style={styles.optionHead}>
            <Ionicons
              name="lock-open-outline"
              size={18}
              color={!locked ? colors.terracotta : colors.textMuted}
            />
            <Text style={[styles.optionTitle, !locked && { color: colors.terracotta }]}>공개</Text>
          </View>
          <Text style={styles.optionDesc}>누구나 글을 볼 수 있고, 팔로우가 즉시 적용됩니다.</Text>
        </Pressable>

        <Pressable
          disabled={busy}
          onPress={() => void select(true)}
          style={[
            styles.option,
            {
              borderColor: locked ? colors.terracotta : colors.border,
              backgroundColor: locked ? `${colors.terracotta}12` : colors.surfaceRaised,
            },
          ]}
        >
          <View style={styles.optionHead}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={locked ? colors.terracotta : colors.textMuted}
            />
            <Text style={[styles.optionTitle, locked && { color: colors.terracotta }]}>잠금</Text>
          </View>
          <Text style={styles.optionDesc}>
            승인된 팔로워만 글을 볼 수 있습니다. 새 팔로우는 요청·승인 후 추가됩니다.
          </Text>
        </Pressable>
      </View>

      {locked || incoming.length > 0 ? (
        <View style={styles.requests}>
          <Text style={styles.requestsTitle}>팔로우 요청</Text>
          {incoming.length === 0 ? (
            <Text style={styles.optionDesc}>대기 중인 팔로우 요청이 없습니다.</Text>
          ) : (
            incoming.map((req) => (
              <View key={req.id} style={styles.requestRow}>
                <FolkAvatar uri={req.user.image} name={req.user.name || req.user.username} size={36} />
                <View style={styles.requestText}>
                  <Text style={styles.requestName} numberOfLines={1}>
                    {req.user.name || req.user.username}
                  </Text>
                  <Text style={styles.requestHandle} numberOfLines={1}>
                    @{req.user.username}
                  </Text>
                </View>
                <Pressable
                  style={[styles.actBtn, { backgroundColor: colors.cobalt }]}
                  onPress={() => void act(req.user.id, "approve")}
                >
                  <Text style={styles.actBtnText}>수락</Text>
                </Pressable>
                <Pressable
                  style={[styles.actBtn, { borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => void act(req.user.id, "reject")}
                >
                  <Text style={[styles.actBtnText, { color: colors.text }]}>거절</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}
    </FolkCard>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return "저장에 실패했습니다.";
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    options: { gap: spacing.sm },
    option: {
      borderWidth: 2,
      borderRadius: radii.md,
      padding: 14,
    },
    optionHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    optionTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    optionDesc: { fontSize: 12, fontWeight: "600", color: colors.textMuted, lineHeight: 17 },
    requests: { marginTop: 16, gap: 10 },
    requestsTitle: { fontSize: 14, fontWeight: "800", color: colors.cobalt },
    requestRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    requestText: { flex: 1, minWidth: 0 },
    requestName: { fontSize: 14, fontWeight: "800", color: colors.text },
    requestHandle: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    actBtn: {
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    actBtnText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  });
}
