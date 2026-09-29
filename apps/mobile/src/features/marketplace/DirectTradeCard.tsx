import { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { postDirectTrade } from "@/api/direct-trade";
import type { DirectTradeView } from "@/api/messages";
import { getArrivalFix } from "@/maps/location";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { showIslandError } from "@/ui/IslandToast";

function formatWhen(iso: string | null) {
  if (!iso) return "아직 없음";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "아직 없음";
  return date.toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function DirectTradeCard({
  view,
  onUpdated,
}: {
  view: DirectTradeView;
  onUpdated?: (next: DirectTradeView) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [current, setCurrent] = useState(view);
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [pin, setPin] = useState("");
  const [meetHour, setMeetHour] = useState(15);

  useEffect(() => {
    setCurrent(view);
  }, [view]);

  async function run(body: Parameters<typeof postDirectTrade>[0]) {
    if (busy) return;
    setBusy(true);
    try {
      const result = await postDirectTrade(body);
      if (result.view?.listingId) {
        setCurrent(result.view);
        onUpdated?.(result.view);
      }
      if (result.error) showIslandError("거래", result.error);
    } catch (error) {
      showIslandError("거래", error instanceof Error ? error.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (busy || locating) return;
    setLocating(true);
    const fix = await getArrivalFix();
    setLocating(false);
    if (!fix.ok) {
      await run({ listingId: current.listingId, action: "verifyArrival", failure: fix.failure });
      return;
    }
    await run({
      listingId: current.listingId,
      action: "verifyArrival",
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyMeters: fix.accuracyMeters,
    });
  }

  function propose() {
    const meetAt = new Date();
    meetAt.setDate(meetAt.getDate() + 1);
    meetAt.setHours(meetHour, 0, 0, 0);
    void run({ listingId: current.listingId, action: "proposeMeet", meetAt: meetAt.toISOString() });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title} numberOfLines={1}>
        {current.listingTitle}
      </Text>
      <Text style={styles.meta}>판매자 @{current.sellerUsername}</Text>
      <Text style={styles.meta}>
        {current.role === "buyer" ? "상대" : "구매자"} @{current.counterpartUsername} · {current.priceLabel}
      </Text>
      <Row label="거래 상태" value={current.tradeStatusLabel} styles={styles} />
      <Row label="약속 시간" value={formatWhen(current.meetAt)} styles={styles} />
      {current.proposedMeetAt && !current.meetAt ? (
        <Row label="제안" value={formatWhen(current.proposedMeetAt)} styles={styles} />
      ) : null}
      <Row label="보증금" value={current.depositStatusLabel} styles={styles} />
      <Row label="분쟁" value={current.disputeStatusLabel} styles={styles} />
      <Row label="내 도착" value={current.myArrivalLabel} styles={styles} />
      <Row label="상대 도착" value={current.counterpartArrivalLabel} styles={styles} />
      <Row label="패널티" value={current.penaltyStatusLabel} styles={styles} />
      {current.guidance ? <Text style={styles.guidance}>{current.guidance}</Text> : null}
      {current.myPin ? (
        <View style={styles.pinBox}>
          <Text style={styles.pin}>{current.myPin}</Text>
          {current.pinWarning ? <Text style={styles.warning}>{current.pinWarning}</Text> : null}
        </View>
      ) : null}

      {current.canProposeMeet ? (
        <View style={styles.rowWrap}>
          {[12, 15, 18, 19].map((hour) => (
            <Pressable key={hour} style={[styles.chip, meetHour === hour && styles.chipOn]} onPress={() => setMeetHour(hour)}>
              <Text style={[styles.chipText, meetHour === hour && { color: colors.textOnAccent }]}>{hour}:00</Text>
            </Pressable>
          ))}
          <Pressable style={styles.btn} disabled={busy} onPress={propose}>
            <Text style={styles.btnText}>내일 약속 제안</Text>
          </Pressable>
        </View>
      ) : null}
      {current.canAcceptMeet ? (
        <Pressable style={styles.btn} disabled={busy} onPress={() => void run({ listingId: current.listingId, action: "acceptMeet" })}>
          <Text style={styles.btnText}>거래 수락</Text>
        </Pressable>
      ) : null}
      {current.canAdjustMeet ? (
        <View style={styles.rowWrap}>
          <Pressable style={styles.btnGhost} disabled={busy} onPress={() => void run({ listingId: current.listingId, action: "adjustMeet", direction: "earlier" })}>
            <Text style={styles.btnGhostText}>15분 앞당기기</Text>
          </Pressable>
          <Pressable style={styles.btnGhost} disabled={busy} onPress={() => void run({ listingId: current.listingId, action: "adjustMeet", direction: "later" })}>
            <Text style={styles.btnGhostText}>15분 늦추기</Text>
          </Pressable>
        </View>
      ) : null}
      {current.canVerifyArrival ? (
        <Pressable style={styles.btn} disabled={busy || locating} onPress={() => void verify()}>
          <Text style={styles.btnText}>
            {locating ? "위치 확인 중" : current.myArrivalStatus === "ARRIVAL_PENDING" ? "현장 도착 인증" : "다시 인증"}
          </Text>
        </Pressable>
      ) : null}
      {current.canReportNoShow ? (
        <Pressable style={styles.btnDanger} disabled={busy} onPress={() => void run({ listingId: current.listingId, action: "reportNoShow" })}>
          <Text style={styles.btnText}>상대방 노쇼 신고</Text>
        </Pressable>
      ) : null}
      {current.canSubmitPin ? (
        <View style={styles.rowWrap}>
          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={(text) => setPin(text.replace(/\D/g, "").slice(0, 6))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="암호코드 6자리"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={styles.btn}
            disabled={busy || pin.length !== 6}
            onPress={() => void run({ listingId: current.listingId, action: "submitPin", pin })}
          >
            <Text style={styles.btnText}>거래 완료</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: spacing.md,
      marginBottom: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: 4,
    },
    title: { color: colors.text, fontSize: 16, fontWeight: "700" },
    meta: { color: colors.textMuted, fontSize: 13 },
    line: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginTop: 2 },
    lineLabel: { color: colors.textMuted, fontSize: 12 },
    lineValue: { color: colors.text, fontSize: 12, fontWeight: "600", flexShrink: 1, textAlign: "right" },
    guidance: { color: colors.text, fontSize: 13, marginTop: spacing.sm, lineHeight: 18 },
    warning: { color: colors.terracotta, fontSize: 12, lineHeight: 17, fontWeight: "700" },
    pinBox: { marginTop: spacing.sm, gap: 6 },
    pin: { color: colors.text, fontSize: 28, fontWeight: "800", letterSpacing: 4 },
    rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
    chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, backgroundColor: colors.muted },
    chipOn: { backgroundColor: colors.brand },
    chipText: { color: colors.text, fontSize: 12, fontWeight: "700" },
    btn: { backgroundColor: colors.brand, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10 },
    btnDanger: { backgroundColor: colors.terracotta, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: spacing.sm },
    btnText: { color: colors.textOnAccent, fontWeight: "700" },
    btnGhost: { borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    btnGhostText: { color: colors.text, fontWeight: "700", fontSize: 13 },
    pinInput: {
      minWidth: 120,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: 18,
      letterSpacing: 2,
    },
  });
}
