import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchUsedTradeRequest,
  respondUsedTradeRequest,
  type UsedTradeRequestDetail,
} from "@/api/marketplace";
import type { Locale } from "@/i18n";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
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

  const sentByMe = request?.requestedById
    ? request.requestedById === selfUserId
    : request?.buyerId === selfUserId;
  const canRespond = request?.canRespond ?? false;

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

  const openListing = useCallback(() => {
    if (!request?.listingId) return;
    navigation.navigate("MarketplaceDetail", { id: request.listingId });
  }, [navigation, request?.listingId]);

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
        ? u("예약됨", "Reserved")
        : request.status === "REJECTED"
          ? u("거절됨", "Declined")
          : u("취소됨", "Cancelled");

  return (
    <Pressable
      onPress={openListing}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={u("중고 상품 상세 보기", "View listing details")}
    >
      <View style={styles.head}>
        <Ionicons name="bag-handle-outline" size={20} color={colors.cobalt} />
        <Text style={styles.title}>{u("중고 거래 요청", "Used trade request")}</Text>
      </View>
      <Text style={styles.body}>
        {sentByMe
          ? u("거래 일정을 보냈습니다.", "You sent a trade schedule.")
          : u("거래 일정이 도착했습니다.", "A trade schedule arrived.")}
      </Text>
      {request.meetAt ? <Text style={styles.meta}>{formatMeetAt(request.meetAt, locale)}</Text> : null}
      <Text style={styles.status}>{statusLabel}</Text>
      {request.status === "PENDING" && canRespond ? (
        <View style={styles.actions} onStartShouldSetResponder={() => true}>
          <Pressable
            style={[styles.circle, styles.rejectCircle]}
            disabled={busy}
            onPress={(e) => {
              e.stopPropagation?.();
              void respond("reject");
            }}
            accessibilityLabel={u("거절", "Decline")}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="close" size={22} color="#fff" />
            )}
          </Pressable>
          <Pressable
            style={[styles.circle, styles.approveCircle]}
            disabled={busy}
            onPress={(e) => {
              e.stopPropagation?.();
              void respond("approve");
            }}
            accessibilityLabel={u("승인", "Approve")}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="checkmark" size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      ) : null}
    </Pressable>
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
    actions: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 8 },
    circle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    rejectCircle: { backgroundColor: "#dc2626" },
    approveCircle: { backgroundColor: "#16a34a" },
  });
}
