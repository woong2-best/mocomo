import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { FolkButton } from "@/ui/FolkButton";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { PaymentCheckoutSheet } from "@/payments/PaymentCheckoutSheet";
import {
  LETTER_DONATION_MESSAGE_MAX,
  LETTER_DONATION_MIN_KRW,
} from "@/lib/chat-letter-donation";

const PRESETS = [5_000, 10_000, 30_000, 50_000, 100_000];

type Props = {
  visible: boolean;
  onClose: () => void;
  creatorId: string;
  username: string;
  displayName: string;
  channelId?: string;
  roomId?: string;
  onSuccess?: () => void;
};

export function LetterDonationSheet({
  visible,
  onClose,
  creatorId,
  username,
  displayName,
  channelId,
  roomId,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [amount, setAmount] = useState(10_000);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [payBody, setPayBody] = useState<{
    type: "TIP";
    amount: number;
    orderName: string;
    metadata: Record<string, unknown>;
  } | null>(null);

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;
  const trimmed = message.trim();
  const creatorGets = Math.round(effectiveAmount * 0.9);

  async function submit() {
    if (effectiveAmount < LETTER_DONATION_MIN_KRW) {
      setError(`최소 ${LETTER_DONATION_MIN_KRW.toLocaleString()}원부터 보낼 수 있습니다.`);
      return;
    }
    if (!trimmed) {
      setError("편지 내용을 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    const meta: Record<string, unknown> = {
      receiverId: creatorId,
      username,
      message: trimmed,
      tipKind: "letter",
    };
    if (channelId) meta.channelId = channelId;
    if (roomId) meta.roomId = roomId;

    setPayBody({
      type: "TIP",
      amount: effectiveAmount,
      orderName: `@${username} 편지 후원`,
      metadata: meta,
    });
    setPayOpen(true);
    setBusy(false);
  }

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
        gap: spacing.sm,
      }}
    >
          <Image source={require("../../assets/wax-envelope.png")} style={styles.hero} resizeMode="cover" />
          <Text style={styles.title}>{displayName}에게 편지</Text>
          <Text style={styles.sub}>
            최소 {LETTER_DONATION_MIN_KRW.toLocaleString()}원 · 수수료 10% (정산 {creatorGets.toLocaleString()}원)
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presets}>
            {PRESETS.map((p) => (
              <Pressable
                key={p}
                style={[styles.preset, !custom && amount === p && styles.presetActive]}
                onPress={() => {
                  setCustom("");
                  setAmount(p);
                }}
              >
                <Text style={[styles.presetText, !custom && amount === p && styles.presetTextActive]}>
                  {p >= 10_000 ? `${p / 10_000}만` : p.toLocaleString()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <TextInput
            style={styles.input}
            placeholder="금액 직접 입력 (원)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            value={custom}
            onChangeText={setCustom}
          />
          <TextInput
            style={[styles.input, styles.messageInput]}
            placeholder="편지 내용"
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={(t) => setMessage(t.slice(0, LETTER_DONATION_MESSAGE_MAX))}
            maxLength={LETTER_DONATION_MESSAGE_MAX}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FolkButton
            label={busy ? "결제 준비 중…" : `${effectiveAmount.toLocaleString()}원 · 편지 보내기`}
            onPress={() => void submit()}
            loading={busy}
            disabled={busy || effectiveAmount < LETTER_DONATION_MIN_KRW || !trimmed}
          />
          <Pressable onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>닫기</Text>
          </Pressable>
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

/** @deprecated */
export const TipCreatorSheet = LetterDonationSheet;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl,
      borderTopRightRadius: radii.xl,
      padding: spacing.lg,
      gap: spacing.sm,
    },
    hero: { width: "100%", height: 140, borderRadius: radii.lg, marginBottom: 4 },
    title: { fontSize: 20, fontWeight: "800", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
    presets: { marginVertical: 4 },
    preset: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
    },
    presetActive: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
    presetText: { fontWeight: "700", color: colors.text },
    presetTextActive: { color: "#fff" },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      backgroundColor: colors.background,
    },
    messageInput: { minHeight: 100, textAlignVertical: "top" },
    error: { color: colors.danger, fontSize: 13, fontWeight: "600" },
    cancel: { alignItems: "center", paddingVertical: 8 },
    cancelText: { color: colors.textMuted, fontWeight: "600" },
  });
}
