import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  acceptCallBooking,
  approveCallBookingRefund,
  completeCallBooking,
  fetchCallBooking,
  formatBookingStatus,
  rejectCallBooking,
  rejectCallBookingRefund,
  requestCallBookingRefund,
  type CallBooking,
} from "@/api/call-bookings";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";
import { formatUsd } from "@/lib/money";

type Props = {
  bookingId: string;
  selfUserId: string;
  peerId: string | null;
  peerName: string;
  peerImage?: string | null;
  roomId: string;
  onRefresh?: () => void;
};

function formatSchedule(iso: string, durationMinutes: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${fmt(start)} ~ ${fmt(end)}`;
}

function canJoinBooking(booking: CallBooking): boolean {
  if (booking.status !== "CONFIRMED") return false;
  const startMs = new Date(booking.scheduledStartAt).getTime();
  const endMs = startMs + booking.durationMinutes * 60_000;
  const now = Date.now();
  return now >= startMs - 10 * 60_000 && now <= endMs + 30 * 60_000;
}

export function CallBookingCard({
  bookingId,
  selfUserId,
  peerId,
  peerName,
  peerImage,
  roomId,
  onRefresh,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [booking, setBooking] = useState<CallBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundReason, setRefundReason] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetchCallBooking(bookingId);
      setBooking(res.booking);
    } catch {
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isCreator = booking?.creatorId === selfUserId;
  const isFan = booking?.fanId === selfUserId;

  async function runAction(fn: () => Promise<unknown>, successMsg?: string) {
    setBusy(true);
    try {
      await fn();
      await load();
      onRefresh?.();
      if (successMsg) Alert.alert("완료", successMsg);
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "처리하지 못했습니다.");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  function joinCall() {
    if (!booking || !peerId) return;
    navigation.navigate("DmCall", {
      roomId,
      calleeId: peerId,
      callType: booking.callType,
      displayName: peerName,
      displayImage: peerImage,
      bookingId: booking.id,
    });
  }

  function submitRefund() {
    const reason = refundReason.trim();
    if (reason.length < 5) {
      Alert.alert("오류", "사유를 5자 이상 입력해 주세요.");
      return;
    }
    void runAction(() => requestCallBookingRefund(bookingId, reason), "환불 신청이 전달되었습니다.")
      .then(() => {
        setRefundOpen(false);
        setRefundReason("");
      })
      .catch(() => undefined);
  }

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.terracotta} size="small" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.card}>
        <Text style={styles.muted}>예약 정보를 불러오지 못했습니다.</Text>
      </View>
    );
  }

  const callLabel = booking.callType === "VIDEO" ? "영상" : "음성";

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons
          name={booking.callType === "VIDEO" ? "videocam" : "call"}
          size={18}
          color={colors.cobalt}
        />
        <Text style={styles.title}>{callLabel} 통화 예약</Text>
      </View>
      <Text style={styles.status}>{formatBookingStatus(booking.status)}</Text>
      <Text style={styles.row}>{formatSchedule(booking.scheduledStartAt, booking.durationMinutes)}</Text>
      <Text style={styles.row}>
        {booking.durationMinutes}분 · {formatUsd(booking.amountKrw)}
      </Text>
      {booking.fanNote ? <Text style={styles.note}>메모: {booking.fanNote}</Text> : null}
      {booking.refund?.status === "REQUESTED" ? (
        <Text style={styles.refundHint}>환불 사유: {booking.refund.reason}</Text>
      ) : null}

      {busy ? <ActivityIndicator color={colors.terracotta} style={{ marginTop: 8 }} /> : null}

      {!busy && isCreator && booking.status === "PENDING_CREATOR" ? (
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => void runAction(() => acceptCallBooking(bookingId), "예약을 수락했습니다.")}>
            <Text style={styles.btnPrimaryText}>수락</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => void runAction(() => rejectCallBooking(bookingId), "예약을 거절하고 환불 처리했습니다.")}>
            <Text style={styles.btnGhostText}>거절</Text>
          </Pressable>
        </View>
      ) : null}

      {!busy && canJoinBooking(booking) ? (
        <Pressable style={[styles.btn, styles.btnPrimary, { marginTop: spacing.sm }]} onPress={joinCall}>
          <Text style={styles.btnPrimaryText}>통화 참여</Text>
        </Pressable>
      ) : null}

      {!busy && isFan && ["CONFIRMED", "EXPIRED"].includes(booking.status) && !booking.refund ? (
        refundOpen ? (
          <View style={{ marginTop: spacing.sm }}>
            <TextInput
              style={styles.refundInput}
              value={refundReason}
              onChangeText={setRefundReason}
              placeholder="환불 사유 (5자 이상)"
              placeholderTextColor={colors.textMuted}
              multiline
            />
            <View style={styles.actions}>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={submitRefund}>
                <Text style={styles.btnPrimaryText}>신청</Text>
              </Pressable>
              <Pressable
                style={[styles.btn, styles.btnGhost]}
                onPress={() => {
                  setRefundOpen(false);
                  setRefundReason("");
                }}
              >
                <Text style={styles.btnGhostText}>취소</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.btn, styles.btnGhost, { marginTop: spacing.sm }]} onPress={() => setRefundOpen(true)}>
            <Text style={styles.btnGhostText}>환불 신청</Text>
          </Pressable>
        )
      ) : null}

      {!busy && isCreator && booking.status === "REFUND_REQUESTED" ? (
        <View style={styles.actions}>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={() => void runAction(() => approveCallBookingRefund(bookingId), "환불을 승인했습니다.")}>
            <Text style={styles.btnPrimaryText}>환불 승인</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={() => void runAction(() => rejectCallBookingRefund(bookingId))}>
            <Text style={styles.btnGhostText}>환불 거절</Text>
          </Pressable>
        </View>
      ) : null}

      {!busy && isCreator && booking.status === "CONFIRMED" ? (
        <Pressable
          style={[styles.btn, styles.btnGhost, { marginTop: spacing.sm }]}
          onPress={() =>
            void runAction(() => completeCallBooking(bookingId), "통화 완료 및 정산이 처리되었습니다.")
          }
        >
          <Text style={styles.btnGhostText}>통화 완료 (정산)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      padding: spacing.md,
      backgroundColor: colors.background,
      minWidth: 240,
      maxWidth: 300,
    },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    title: { fontSize: 15, fontWeight: "700", color: colors.text },
    status: { fontSize: 13, fontWeight: "600", color: colors.terracotta, marginTop: 4 },
    row: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    note: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontStyle: "italic" },
    refundHint: { fontSize: 12, color: colors.danger, marginTop: 6 },
    muted: { fontSize: 13, color: colors.textMuted },
    actions: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
    btn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      alignItems: "center",
    },
    btnPrimary: { backgroundColor: colors.cobalt },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 13 },
    btnGhost: { borderWidth: 1, borderColor: colors.border },
    btnGhostText: { color: colors.text, fontWeight: "600", fontSize: 13 },
    refundInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: 10,
      minHeight: 64,
      color: colors.text,
      fontSize: 13,
      textAlignVertical: "top",
    },
  });
}
