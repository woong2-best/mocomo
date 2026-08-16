import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import {
  calcDurationMinutes,
  createCallBooking,
  fetchCreatorCallSettings,
  type CreatorCallSettings,
} from "@/api/call-bookings";
import { PaymentCheckoutSheet } from "@/payments/PaymentCheckoutSheet";
import { FolkButton } from "@/ui/FolkButton";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const AMOUNT_PRESETS = [10_000, 30_000, 50_000, 100_000, 150_000, 200_000];

type Props = {
  visible: boolean;
  onClose: () => void;
  creatorId: string;
  roomId: string;
  callType: "AUDIO" | "VIDEO";
  displayName: string;
  onSuccess?: () => void;
};

function parseSchedule(dateStr: string, timeStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  const t = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
  if (!m || !t) return null;
  const d = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(t[1]),
    Number(t[2]),
    0,
    0
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function defaultDateStr() {
  const d = new Date(Date.now() + 24 * 60 * 60_000);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function CreatorCallBookingSheet({
  visible,
  onClose,
  creatorId,
  roomId,
  callType,
  displayName,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<CreatorCallSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dateStr, setDateStr] = useState(defaultDateStr);
  const [timeStr, setTimeStr] = useState("14:00");
  const [amount, setAmount] = useState(30_000);
  const [customAmount, setCustomAmount] = useState("");
  const [note, setNote] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payBody, setPayBody] = useState<{
    type: "CALL_BOOKING";
    amount: number;
    orderName: string;
    metadata: Record<string, unknown>;
  } | null>(null);

  const effectiveAmount = customAmount
    ? parseInt(customAmount.replace(/\D/g, ""), 10) || 0
    : amount;

  const durationMinutes =
    settings?.rateKrwPerHour && effectiveAmount > 0
      ? calcDurationMinutes(effectiveAmount, settings.rateKrwPerHour)
      : 0;

  useEffect(() => {
    if (!visible) return;
    setError("");
    setLoading(true);
    void fetchCreatorCallSettings(creatorId)
      .then((s) => {
        setSettings(s);
        if (s.rateKrwPerHour) {
          const preset = AMOUNT_PRESETS.find((p) => calcDurationMinutes(p, s.rateKrwPerHour!) >= 30);
          if (preset) setAmount(preset);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, [visible, creatorId]);

  async function submit() {
    if (!settings?.bookable || !settings.rateKrwPerHour) {
      setError("통화 예약을 받지 않는 크리에이터입니다.");
      return;
    }
    const scheduled = parseSchedule(dateStr, timeStr);
    if (!scheduled) {
      setError("날짜(YYYY-MM-DD)와 시간(HH:mm)을 확인해 주세요.");
      return;
    }
    if (effectiveAmount < 5_000) {
      setError("최소 결제 금액은 5,000원입니다.");
      return;
    }
    if (durationMinutes < 15) {
      setError("금액이 너무 적어 최소 15분 통화를 예약할 수 없습니다.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      const { checkout } = await createCallBooking({
        creatorId,
        chatRoomId: roomId,
        callType,
        scheduledStartAt: scheduled.toISOString(),
        amountKrw: effectiveAmount,
        fanNote: note.trim() || undefined,
      });

      setPayBody({
        type: "CALL_BOOKING",
        amount: checkout.amount,
        orderName: checkout.orderName,
        metadata: checkout.metadata,
      });
      setPayOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const callLabel = callType === "VIDEO" ? "영상" : "음성";

  return (
    <>
    <KeyboardSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      sheetStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
      }}
    >
          <Text style={styles.title}>{displayName} · {callLabel} 통화 예약</Text>
          <Text style={styles.sub}>
            결제 후 크리에이터에게 예약 신청이 전달됩니다. 수락 후 예약 시간에 통화할 수 있어요.
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.lg }} />
          ) : !settings?.bookable ? (
            <Text style={styles.error}>이 크리에이터는 유료 통화 예약을 받지 않습니다.</Text>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>
                시간당 {settings.rateKrwPerHour?.toLocaleString()}원
              </Text>

              <Text style={styles.fieldLabel}>날짜</Text>
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>시간</Text>
              <TextInput
                style={styles.input}
                value={timeStr}
                onChangeText={setTimeStr}
                placeholder="14:00"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.fieldLabel}>결제 금액</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets}>
                {AMOUNT_PRESETS.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.preset, !customAmount && amount === p && styles.presetActive]}
                    onPress={() => {
                      setCustomAmount("");
                      setAmount(p);
                    }}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        !customAmount && amount === p && styles.presetTextActive,
                      ]}
                    >
                      {p.toLocaleString()}원
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <TextInput
                style={styles.input}
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="직접 입력 (원)"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
              />

              {durationMinutes > 0 ? (
                <Text style={styles.durationHint}>
                  예상 통화 시간: 약 {durationMinutes}분
                </Text>
              ) : null}

              <Text style={styles.fieldLabel}>메모 (선택)</Text>
              <TextInput
                style={[styles.input, styles.noteInput]}
                value={note}
                onChangeText={setNote}
                placeholder="크리에이터에게 전달할 메모"
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={500}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <FolkButton label={busy ? "처리 중…" : "결제하고 예약 신청"} onPress={submit} disabled={busy} />
            </ScrollView>
          )}
    </KeyboardSheet>
    {payBody ? (
      <PaymentCheckoutSheet
        visible={payOpen}
        body={payBody}
        onClose={() => setPayOpen(false)}
        onSuccess={() => {
          onSuccess?.();
          onClose();
        }}
      />
    ) : null}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      maxHeight: "88%",
    },
    title: { fontSize: 18, fontWeight: "700", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginTop: 6, marginBottom: spacing.md, lineHeight: 18 },
    label: { fontSize: 14, fontWeight: "600", color: colors.cobalt, marginBottom: spacing.sm },
    fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      marginTop: 6,
      color: colors.text,
      backgroundColor: colors.background,
    },
    noteInput: { minHeight: 72, textAlignVertical: "top" },
    presets: { marginTop: 8, marginBottom: 4 },
    preset: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    presetActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    presetText: { fontSize: 13, color: colors.text },
    presetTextActive: { color: "#fff", fontWeight: "600" },
    durationHint: { fontSize: 13, color: colors.terracotta, marginTop: 8, fontWeight: "600" },
    error: { color: colors.danger, fontSize: 13, marginVertical: spacing.sm },
  });
}
