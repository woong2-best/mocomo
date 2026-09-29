import { useEffect, useMemo, useState } from "react";
import {
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
import { fetchGemsWallet } from "@/api/gems";
import { sendLetterDonation } from "@/api/letter-donations";
import {
  LETTER_DONATION_MESSAGE_MAX,
  LETTER_DONATION_MIN_MOCO,
} from "@/lib/chat-letter-donation";
import { useI18n } from "@/i18n/I18nProvider";

const PRESETS = [1, 2, 5, 10, 20];

function formatMoco(moco: number) {
  return `${Math.max(0, Math.floor(moco)).toLocaleString()} MOCO`;
}

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
  displayName,
  roomId,
  onSuccess,
}: Props) {
  const { u, t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [amount, setAmount] = useState(2);
  const [custom, setCustom] = useState("");
  const [message, setMessage] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const effectiveAmount = custom ? parseInt(custom.replace(/\D/g, ""), 10) || 0 : amount;
  const trimmed = message.trim();

  useEffect(() => {
    if (!visible) return;
    setError("");
    void fetchGemsWallet()
      .then((w) => setBalance(w.balance))
      .catch(() => setBalance(null));
  }, [visible]);

  async function submit() {
    if (!roomId) {
      setError(u("대화방에서만 편지를 보낼 수 있습니다.", "Letters can only be sent from a chat room."));
      return;
    }
    if (effectiveAmount < LETTER_DONATION_MIN_MOCO) {
      setError(u(`최소 ${formatMoco(LETTER_DONATION_MIN_MOCO)}부터 보낼 수 있습니다.`, `Minimum ${formatMoco(LETTER_DONATION_MIN_MOCO)}.`));
      return;
    }
    if (!trimmed) {
      setError(u("편지 내용을 입력해 주세요.", "Write your letter."));
      return;
    }
    if (balance != null && balance < effectiveAmount) {
      setError(u("MOCO 잔액이 부족합니다. mocomo.net 웹에서 충전해 주세요.", "Not enough MOCO. Top up on mocomo.net."));
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await sendLetterDonation({
        receiverId: creatorId,
        roomId,
        moco: effectiveAmount,
        message: trimmed,
      });
      setBalance(res.balance);
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : u("편지를 보내지 못했습니다.", "Could not send letter."));
    } finally {
      setBusy(false);
    }
  }

  return (
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
      <Text style={styles.title}>{u(`${displayName}에게 편지`, `Letter to ${displayName}`)}</Text>
      <Text style={styles.sub}>
        {u("최소", "Min")} {formatMoco(LETTER_DONATION_MIN_MOCO)} ·{" "}
        {u("상대가 봉투를 열면 MOCO가 전달됩니다", "MOCO is delivered when they open the envelope")}
        {balance != null ? ` · ${u("보유", "Balance")} ${formatMoco(balance)}` : ""}
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
              {formatMoco(p)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <TextInput
        style={styles.input}
        placeholder={u("금액 직접 입력 (MOCO)", "Custom amount (MOCO)")}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        value={custom}
        onChangeText={setCustom}
      />
      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder={u("편지 내용", "Letter message")}
        placeholderTextColor={colors.textMuted}
        value={message}
        onChangeText={(t) => setMessage(t.slice(0, LETTER_DONATION_MESSAGE_MAX))}
        maxLength={LETTER_DONATION_MESSAGE_MAX}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FolkButton
        label={busy ? u("보내는 중…", "Sending…") : u(`${formatMoco(effectiveAmount)} · 편지 보내기`, `${formatMoco(effectiveAmount)} · Send letter`)}
        onPress={() => void submit()}
        loading={busy}
        disabled={busy || effectiveAmount < LETTER_DONATION_MIN_MOCO || !trimmed || !roomId}
      />
      <Pressable onPress={onClose} style={styles.cancel}>
        <Text style={styles.cancelText}>{t("common.close")}</Text>
      </Pressable>
    </KeyboardSheet>
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
