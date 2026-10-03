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
  const { t } = useI18n();
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
      setError(t("m.payments.letters_can_only_be_sent_from"));
      return;
    }
    if (effectiveAmount < LETTER_DONATION_MIN_MOCO) {
      setError(t("m.payments.minimum_formatmoco", { formatMoco: String(formatMoco(LETTER_DONATION_MIN_MOCO)) }));
      return;
    }
    if (!trimmed) {
      setError(t("m.payments.write_your_letter"));
      return;
    }
    if (balance != null && balance < effectiveAmount) {
      setError(t("m.payments.not_enough_moco_top_up_on"));
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
      setError(e instanceof Error ? e.message : t("m.payments.could_not_send_letter"));
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
      <Text style={styles.title}>{t("m.payments.letter_to_displayname", { displayName: String(displayName) })}</Text>
      <Text style={styles.sub}>
        {t("m.common.min")} {formatMoco(LETTER_DONATION_MIN_MOCO)} ·{" "}
        {t("m.payments.moco_is_delivered_when_they_open")}
        {balance != null ? ` · ${t("m.payments.balance")} ${formatMoco(balance)}` : ""}
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
        placeholder={t("m.payments.custom_amount_moco")}
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        value={custom}
        onChangeText={setCustom}
      />
      <TextInput
        style={[styles.input, styles.messageInput]}
        placeholder={t("m.payments.letter_message")}
        placeholderTextColor={colors.textMuted}
        value={message}
        onChangeText={(t) => setMessage(t.slice(0, LETTER_DONATION_MESSAGE_MAX))}
        maxLength={LETTER_DONATION_MESSAGE_MAX}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FolkButton
        label={busy ? t("m.common.sending") : t("m.payments.formatmoco_send_letter", { formatMoco: String(formatMoco(effectiveAmount)) })}
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
