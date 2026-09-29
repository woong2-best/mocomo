import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchUsedTradeRequest,
  respondUsedTradeRequest,
  type UsedTradeRequestDetail,
} from "@/api/marketplace";
import type { Locale } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { uiText } from "@/i18n/ui-text";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  requestId: string;
  selfUserId: string;
  roomId: string;
  onRefresh?: () => void;
};

export function UsedTradeRequestCard({ requestId, selfUserId, roomId, onRefresh }: Props) {
  const { locale, u } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [request, setRequest] = useState<UsedTradeRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchUsedTradeRequest(requestId);
      setRequest(res.request);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isSeller = request?.sellerId === selfUserId;
  const sentByMe = request?.requestedById
    ? request.requestedById === selfUserId
    : request?.buyerId === selfUserId;
  const canRespond = request?.canRespond ?? (request?.status === "PENDING" && isSeller && !sentByMe);

  async function respond(action: "approve" | "reject") {
    if (!request || busy) return;
    setBusy(true);
    try {
      await respondUsedTradeRequest(requestId, action);
      await load();
      await queryClient.invalidateQueries({ queryKey: ["mobile-used-meet-pins"] });
      onRefresh?.();
      showIslandSuccess(
        action === "approve" ? u("승인했습니다", "Approved") : u("거절했습니다", "Declined"),
        action === "approve" ? u("이제 이 글은 수정할 수 없습니다.", "This listing can no longer be edited.") : undefined
      );
    } catch (e) {
      showIslandError(u("오류", "Error"), e instanceof Error ? e.message : u("처리하지 못했습니다.", "Could not complete action."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.cobalt} />
      </View>
    );
  }

  if (!request) return null;

  const statusLabel =
    request.status === "PENDING"
      ? u("대기 중", "Pending")
      : request.status === "APPROVED"
        ? u("승인됨", "Approved")
        : request.status === "REJECTED"
          ? u("거절됨", "Declined")
          : u("취소됨", "Cancelled");

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="bag-handle-outline" size={20} color={colors.cobalt} />
        <Text style={styles.title}>{u("중고 거래 요청", "Used trade request")}</Text>
      </View>
      <Text style={styles.body}>
        {sentByMe
          ? u("거래 일정을 보냈습니다.", "You sent a trade schedule.")
          : u("거래 일정이 도착했습니다.", "A trade schedule arrived.")}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {request.listingTitle}
      </Text>
      {request.meetAt ? <Text style={styles.meta}>{formatMeetAt(request.meetAt, locale)}</Text> : null}
      <Text style={styles.status}>{statusLabel}</Text>
      {request.status === "PENDING" && canRespond ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.rejectBtn]}
            disabled={busy}
            onPress={() => void respond("reject")}
          >
            <Text style={styles.rejectText}>{u("거절", "Decline")}</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.approveBtn]}
            disabled={busy}
            onPress={() => void respond("approve")}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.approveText}>{u("승인", "Approve")}</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function formatMeetAt(iso: string, locale: Locale) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const daysKo = ["일", "월", "화", "수", "목", "금", "토"];
  const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const days = locale === "ko" ? daysKo : daysEn;
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getMonth() + 1}/${date.getDate()} (${days[date.getDay()]}) ${hh}:${mm}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      maxWidth: 280,
      borderRadius: radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      padding: spacing.md,
      gap: 6,
    },
    head: { flexDirection: "row", alignItems: "center", gap: 8 },
    title: { fontWeight: "800", color: colors.text, fontSize: 14 },
    body: { color: colors.text, fontWeight: "600", fontSize: 13 },
    meta: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
    status: { color: colors.cobalt, fontSize: 12, fontWeight: "700", marginTop: 2 },
    actions: { flexDirection: "row", gap: 8, marginTop: 8 },
    btn: {
      flex: 1,
      height: 40,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectBtn: { borderWidth: 1, borderColor: colors.border },
    rejectText: { color: colors.text, fontWeight: "700" },
    approveBtn: { backgroundColor: colors.cobalt },
    approveText: { color: colors.textOnAccent, fontWeight: "800" },
  });
}
