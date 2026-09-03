import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import {
  COMMENT_DONATION_MESSAGE_MAX,
  COMMENT_DONATION_PRESETS,
  MIN_TIP_USD_CENTS,
  commentDonationTier,
} from "@/lib/comment-donation";
import { formatUsd } from "@/lib/money";
import { PaymentCheckoutSheet } from "@/payments/PaymentCheckoutSheet";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  creatorId: string;
  username: string;
  displayName: string;
  channelId: string;
  onSuccess?: () => void;
};

export function CommentDonationSheet({
  visible,
  onClose,
  creatorId,
  username,
  displayName,
  channelId,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(COMMENT_DONATION_PRESETS[1] ?? 500);
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
  const tier = commentDonationTier(effectiveAmount);
  const viewerName = user?.username ?? user?.name?.replace(/^@/, "") ?? "me";
  const creatorGets = Math.round(effectiveAmount * 0.9);

  async function submit() {
    if (effectiveAmount < MIN_TIP_USD_CENTS) {
      setError(`최소 ${formatUsd(MIN_TIP_USD_CENTS)}부터 후원할 수 있습니다.`);
      return;
    }
    if (!trimmed) {
      setError("채팅에 표시할 메시지를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setError("");
    setPayBody({
      type: "TIP",
      amount: effectiveAmount,
      orderName: `${displayName} 댓글 후원`,
      metadata: {
        receiverId: creatorId,
        username,
        message: trimmed,
        channelId,
        tipKind: "superchat",
      },
    });
    setPayOpen(true);
    setBusy(false);
  }

  return (
    <>
      <KeyboardSheet visible={visible} onClose={onClose} maxHeight="88%" sheetStyle={{ backgroundColor: colors.surface }}>
        <Text style={styles.title}>{displayName}에게 감사를 전하세요</Text>
        <Text style={styles.sub}>댓글 후원을 구매하면 채팅에 하이라이트 댓글이 게시됩니다.</Text>

        <View style={styles.preview}>
          <View style={[styles.previewHeader, { backgroundColor: tier.headerBg }]}>
            <FolkAvatar uri={user?.image ?? null} name={viewerName} size={32} framed={false} />
            <View style={styles.previewMeta}>
              <View style={styles.previewTop}>
                <Text style={styles.previewUser}>@{viewerName}</Text>
                <View style={styles.badge}>
                  <Ionicons name="logo-usd" size={10} color="#fff" />
                  <Text style={styles.badgeText}>{formatUsd(effectiveAmount)}</Text>
                </View>
              </View>
              <Text style={styles.previewMsg}>{trimmed || "후원 메시지 미리보기…"}</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
          {COMMENT_DONATION_PRESETS.map((p) => (
            <Pressable
              key={p}
              style={[styles.preset, !custom && amount === p && styles.presetActive]}
              onPress={() => {
                setAmount(p);
                setCustom("");
              }}
            >
              <Text style={[styles.presetText, !custom && amount === p && styles.presetTextActive]}>
                {formatUsd(p)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextInput
          style={styles.input}
          value={custom}
          onChangeText={setCustom}
          placeholder={`금액 직접 입력 (최소 ${formatUsd(MIN_TIP_USD_CENTS)})`}
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
        />

        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, COMMENT_DONATION_MESSAGE_MAX))}
          placeholder="채팅에 표시할 메시지 (필수)"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={COMMENT_DONATION_MESSAGE_MAX}
        />
        <Text style={styles.counter}>
          {trimmed.length}/{COMMENT_DONATION_MESSAGE_MAX}
        </Text>

        <Text style={styles.fee}>수수료 10% · 크리에이터 정산 {formatUsd(creatorGets)}</Text>

        <Pressable
          style={[styles.submit, busy && styles.submitDisabled]}
          disabled={busy}
          onPress={() => void submit()}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>구매 후 보내기 · {formatUsd(effectiveAmount)}</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardSheet>

      {payBody ? (
        <PaymentCheckoutSheet
          visible={payOpen}
          body={payBody}
          onClose={() => setPayOpen(false)}
          onSuccess={() => {
            setPayOpen(false);
            onClose();
            onSuccess?.();
          }}
        />
      ) : null}
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    sub: { marginTop: 4, fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: spacing.sm },
    preview: { borderRadius: radii.md, overflow: "hidden", marginBottom: spacing.sm },
    previewHeader: { flexDirection: "row", gap: 10, padding: 12 },
    previewMeta: { flex: 1, minWidth: 0 },
    previewTop: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6 },
    previewUser: { fontSize: 13, fontWeight: "800", color: "rgba(255,255,255,0.95)" },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 2,
      backgroundColor: "rgba(0,0,0,0.25)",
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    badgeText: { color: "#fff", fontSize: 11, fontWeight: "900" },
    previewMsg: { marginTop: 4, fontSize: 13, fontWeight: "700", color: "#fff", lineHeight: 18 },
    presetsRow: { marginBottom: 8 },
    preset: {
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginRight: 8,
      backgroundColor: colors.muted,
    },
    presetActive: { borderColor: colors.cobalt, backgroundColor: `${colors.cobalt}14` },
    presetText: { fontSize: 13, fontWeight: "800", color: colors.textMuted },
    presetTextActive: { color: colors.cobalt },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontWeight: "600",
      backgroundColor: colors.muted,
      marginBottom: 8,
    },
    textarea: { minHeight: 80, textAlignVertical: "top" },
    counter: { textAlign: "right", fontSize: 11, color: colors.textMuted, marginBottom: 8 },
    fee: { fontSize: 11, color: colors.textMuted, marginBottom: 10 },
    submit: {
      backgroundColor: colors.cobalt,
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
    },
    submitDisabled: { opacity: 0.5 },
    submitText: { color: "#fff", fontWeight: "900", fontSize: 14 },
    error: { marginTop: 8, color: colors.danger, fontWeight: "600", fontSize: 12 },
  });
}
