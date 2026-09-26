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
import { useQuery } from "@tanstack/react-query";
import { postLiveMocoDonation } from "@/api/live-donate";
import { ApiError } from "@/api/client";
import { fetchGemsWallet } from "@/api/gems";
import {
  DONATION_SFX_CATALOG,
  MOCO_DONATION_MAX_AMOUNT,
  MOCO_DONATION_MIN_SFX,
} from "@/lib/moco-donation-sfx-catalog";
import { MOCO_PURCHASE_TERMS_COPY } from "@/lib/gems/constants";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sfxKey, setSfxKey] = useState(DONATION_SFX_CATALOG[0]?.id ?? "default");
  const [mocoAmount, setMocoAmount] = useState(String(MOCO_DONATION_MIN_SFX));
  const [message, setMessage] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      setError("후원 전 약관에 동의해 주세요.");
      return;
    }
    const trimmed = message.trim();
    if (!trimmed) {
      setError("방송 화면에 표시할 메시지를 입력해 주세요.");
      return;
    }
    const moco = Math.floor(Number(mocoAmount) || 0);
    if (moco < MOCO_DONATION_MIN_SFX || moco > MOCO_DONATION_MAX_AMOUNT) {
      setError(`MOCO는 ${MOCO_DONATION_MIN_SFX}~${MOCO_DONATION_MAX_AMOUNT.toLocaleString()} 범위입니다.`);
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
        setError(res.error ?? "후원에 실패했습니다.");
        return;
      }
      onSuccess?.();
      onClose();
    } catch (e) {
      if (e instanceof ApiError && e.status === 402) {
        showIslandError("MOCO 부족", "mocomo.net 웹사이트에서 MOCO를 충전한 뒤 다시 시도해 주세요.");
      } else {
        setError(apiErrorMessage(e, "후원에 실패했습니다."));
      }
    } finally {
      setBusy(false);
    }
  }

  const balance = wallet.data?.balance;

  return (
    <KeyboardSheet visible={visible} onClose={onClose} maxHeight="88%" sheetStyle={{ backgroundColor: colors.surface }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>효과음 후원</Text>
        {typeof balance === "number" ? (
          <Text style={styles.balance}>보유 MOCO: {balance.toLocaleString()}</Text>
        ) : wallet.isLoading ? (
          <ActivityIndicator style={{ marginVertical: 8 }} />
        ) : null}

        <Text style={styles.label}>효과음</Text>
        <View style={styles.sfxRow}>
          {DONATION_SFX_CATALOG.map((s) => (
            <Pressable
              key={s.id}
              style={[styles.sfxChip, sfxKey === s.id && styles.sfxChipActive]}
              onPress={() => setSfxKey(s.id)}
            >
              <Text style={[styles.sfxChipText, sfxKey === s.id && styles.sfxChipTextActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>MOCO</Text>
        <TextInput
          style={styles.input}
          value={mocoAmount}
          onChangeText={setMocoAmount}
          keyboardType="number-pad"
          placeholder={`최소 ${MOCO_DONATION_MIN_SFX}`}
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>방송 화면 메시지</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={(t) => setMessage(t.slice(0, 500))}
          placeholder="후원과 함께 표시할 문구"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={500}
        />
        <Text style={styles.hint}>OBS 알림에 닉네임·MOCO·메시지가 함께 노출됩니다.</Text>

        <Pressable style={styles.termsRow} onPress={() => setTermsAccepted((v) => !v)}>
          <View style={[styles.checkbox, termsAccepted && styles.checkboxOn]} />
          <Text style={styles.termsText}>{MOCO_PURCHASE_TERMS_COPY}</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={[styles.submit, busy && styles.submitDisabled]} disabled={busy} onPress={() => void submit()}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>후원하기</Text>}
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
