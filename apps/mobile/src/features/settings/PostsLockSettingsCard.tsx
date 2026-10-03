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
import { useI18n } from "@/i18n/I18nProvider";
import { translate } from "@/i18n/runtime";

export function PostsLockSettingsCard() {
  const { t } = useI18n();
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
        showIslandToast("Saved", next ? t("m.settings.your_account_is_now_locked") : t("m.settings.your_account_is_now_public"));
      } catch (e) {
        showIslandError(t("m.common.error"), errorMessage(e));
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
        showIslandError(t("m.common.error"), errorMessage(e));
      }
    },
    [queryClient, refreshMe]
  );

  if (!user?.id) return null;

  const incoming = requests.data?.requests ?? [];

  return (
    <FolkCard>
      <Text style={styles.cardTitle}>{t("m.settings.lock_posts")}</Text>
      <Text style={styles.cardDesc}>
        {t("m.settings.when_your_account_is_locked_only")}
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
            <Text style={[styles.optionTitle, !locked && { color: colors.terracotta }]}>{t("m.settings.public")}</Text>
          </View>
          <Text style={styles.optionDesc}>{t("m.settings.anyone_can_see_your_posts_and")}</Text>
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
            <Text style={[styles.optionTitle, locked && { color: colors.terracotta }]}>{t("m.settings.locked")}</Text>
          </View>
          <Text style={styles.optionDesc}>
            {t("m.settings.only_approved_followers_can_see_your")}
          </Text>
        </Pressable>
      </View>

      {locked || incoming.length > 0 ? (
        <View style={styles.requests}>
          <Text style={styles.requestsTitle}>{t("m.settings.follow_requests")}</Text>
          {incoming.length === 0 ? (
            <Text style={styles.optionDesc}>{t("m.settings.no_pending_follow_requests")}</Text>
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
                  <Text style={styles.actBtnText}>{t("m.live.accept")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.actBtn, { borderColor: colors.border, borderWidth: 1 }]}
                  onPress={() => void act(req.user.id, "reject")}
                >
                  <Text style={[styles.actBtnText, { color: colors.text }]}>{t("m.messages.decline")}</Text>
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
  return translate("m.common.could_not_save");
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
