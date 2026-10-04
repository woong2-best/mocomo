import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { showIslandError } from "@/ui/IslandToast";
import { fetchCreatorPayoutReady, isStripeAccountNotReady } from "@/lib/creator-payout";
import { useQuery } from "@tanstack/react-query";
import { postLiveMocoDonation } from "@/api/live-donate";
import { ApiError } from "@/api/client";
import { fetchGemsWallet } from "@/api/gems";
import {
  DONATION_SFX_CATALOG,
  MOCO_DONATION_MAX_AMOUNT,
  MOCO_DONATION_MIN_SFX,
} from "@/lib/moco-donation-sfx-catalog";
import { mocoPurchaseTermsCopy } from "@/lib/gems/constants";
import { parseSpendableMoco, sanitizeMocoDecimalInput } from "@/lib/moco-amount";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  channelId: string;
  onSuccess?: () => void;
};

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    const err = (e.body as { error: unknown }).error;
    if (typeof err === "string") return err;
  }
  return e instanceof Error ? e.message : fallback;
}

export function LiveMocoSfxDonationSheet({ visible, onClose, channelId, onSuccess }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const payoutBlockedMsg = t("m.live.this_creator_has_not_linked_a");
  const payoutToastMsg = t("m.live.this_creator_has_not_linked_a_2");
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sfxKey, setSfxKey] = useState(DONATION_SFX_CATALOG[0]?.id ?? "default");
  const [mocoAmount, setMocoAmount] = useState(String(MOCO_DONATION_MIN_SFX));
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const payout = useQuery({
    queryKey: ["payout-ready", channelId],
    queryFn: () => fetchCreatorPayoutReady(channelId),
    enabled: visible && !!channelId,
  });
  const payoutBlocked = payout.data?.payoutsEnabled === false;

  const wallet = useQuery({
    queryKey: ["gems-wallet"],
    queryFn: fetchGemsWallet,
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) {
      setMessage("");
      setError("");
      setTermsAccepted(false);
      setMocoAmount(String(MOCO_DONATION_MIN_SFX));
    }
  }, [visible]);

  async function submit() {
    if (!termsAccepted) {
      setError(t("m.live.accept_the_terms_before_tipping"));
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError(t("m.live.enter_a_message_to_show_on"));
      return;
    }
    const moco = parseSpendableMoco(mocoAmount);
    if (moco == null || moco < MOCO_DONATION_MIN_SFX || moco > MOCO_DONATION_MAX_AMOUNT) {
      setError(
        t("m.live.moco_must_be_between_moco_donation", { MOCO_DONATION_MIN_SFX: String(MOCO_DONATION_MIN_SFX), MOCO_DONATION_MAX_AMOUNT: String(MOCO_DONATION_MAX_AMOUNT.toLocaleString()) })
      );
      return;
    }

    setBusy(true);
    setError("");
    try {
      const res = await postLiveMocoDonation(channelId, {
        type: "SFX",
        moco_amount: moco,
        sfx_key: sfxKey,
        message: trimmed,
      });
      if (!res.success) {
        setError(res.error ?? t("m.live.tip_failed"));
        return;
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      if (isStripeAccountNotReady(e)) {
        showIslandError(t("m.live.tip_unavailable"), payoutToastMsg);
        setError(payoutBlockedMsg);
      } else if (e instanceof ApiError && e.status === 402) {
        showIslandError(
          t("m.live.not_enough_moco"),
          t("m.live.top_up_moco_on_mocomo_net")
        );
      } else {
        setError(apiErrorMessage(e, t("m.live.tip_failed")));
      }
    } finally {
      setBusy(false);
    }
  }

  const balance = wallet.data?.balance;

  return (
    <KeyboardSheet visible={visible} onClose={onClose} maxHeight="88%" sheetStyle={{ backgroundColor: colors.surface }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t("m.live.sound_effect_tip")}</Text>
        {typeof balance === "number" ? (
          <Text style={styles.balance}>
            {t("m.live.moco_balance")} {balance.toLocaleString()}
          </Text>
        ) : wallet.isLoading ? (
          <ActivityIndicator style={{ marginVertical: 8 }} />
        ) : null}

        <Text style={styles.label}>{t("m.live.sound_effect")}</Text>
        <View style={styles.sfxRow}>
          {DONATION_SFX_CATALOG.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.sfxChip, sfxKey === s.id && styles.sfxChipActive]}
              onPress={() => setSfxKey(s.id)}
            >
              <Text style={[styles.sfxChipText, sfxKey === s.id && styles.sfxChipTextActive]}>
                {s.id === "default" ? t("m.live.donation_sfx_default") : s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>MOCO</Text>
        <TextInput
          style={styles.input}
          value={mocoAmount}
          onChangeText={(value) => setMocoAmount(sanitizeMocoDecimalInput(value))}
          keyboardType="decimal-pad"
          placeholder={t("m.live.min_moco_donation_min_sfx", { MOCO_DONATION_MIN_SFX: String(MOCO_DONATION_MIN_SFX) })}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>{t("m.live.on_stream_message")}</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, 500))}
          placeholder={t("m.live.message_shown_with_your_tip")}
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />
        <Text style={styles.hint}>
          {t("m.live.obs_alerts_show_nickname_moco_and")}
        </Text>

        <Pressable style={styles.termsRow} onPress={() => setTermsAccepted((v) => !v)}>
          <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]} />
          <Text style={styles.termsText}>{mocoPurchaseTermsCopy()}</Text>
        </Pressable>

        {payoutBlocked ? <Text style={styles.error}>{payoutBlockedMsg}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.submit, (busy || payoutBlocked) && styles.submitDisabled]}
          disabled={busy || payoutBlocked}
          onPress={() => void submit()}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>{t("m.live.send_tip")}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "900", color: colors.text },
    balance: { marginTop: 4, fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: spacing.sm },
    label: { fontSize: 12, fontWeight: "800", color: colors.textMuted, marginTop: 8, marginBottom: 6 },
    sfxRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    sfxChip: {
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.muted,
    },
    sfxChipActive: { borderColor: "#E85D04", backgroundColor: "#E85D0412" },
    sfxChipText: { fontSize: 13, fontWeight: "700", color: colors.textMuted },
    sfxChipTextActive: { color: "#E85D04" },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontWeight: "600",
      backgroundColor: colors.muted,
    },
    textarea: { minHeight: 88, textAlignVertical: "top", marginTop: 0 },
    hint: { fontSize: 10, color: colors.textMuted, marginTop: 6, marginBottom: 8 },
    termsRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginVertical: 10 },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      marginTop: 2,
    },
    checkboxOn: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    termsText: { flex: 1, fontSize: 10, lineHeight: 15, color: colors.textMuted, fontWeight: "600" },
    submit: {
      backgroundColor: "#E85D04",
      borderRadius: radii.md,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 8,
      marginBottom: spacing.lg,
    },
    submitDisabled: { opacity: 0.55 },
    submitText: { color: "#fff", fontWeight: "900", fontSize: 15 },
    error: { color: colors.danger, fontWeight: "600", fontSize: 12, marginBottom: 8 },
  });
}
