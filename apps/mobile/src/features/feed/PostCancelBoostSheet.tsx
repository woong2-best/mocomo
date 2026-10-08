import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { cancelPostBoost, fetchPostBoostStatus, type BoostRefundQuote } from "@/api/post-boost";
import { KeyboardSheet } from "@/ui/KeyboardSheet";
import { FolkButton } from "@/ui/FolkButton";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  visible: boolean;
  postId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function PostCancelBoostSheet({ visible, postId, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [refund, setRefund] = useState<BoostRefundQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError("");
    setLoading(true);
    void fetchPostBoostStatus(postId)
      .then((s) => setRefund(s.refund))
      .catch((e) => setError(e instanceof Error ? e.message : t("m.boost.load_failed")))
      .finally(() => setLoading(false));
  }, [visible, postId, t]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await cancelPostBoost(postId);
      showIslandSuccess(t("m.boost.cancel_success"));
      onSuccess?.();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : t("m.boost.cancel_failed");
      setError(message);
      showIslandError(t("m.common.error"), message);
    } finally {
      setBusy(false);
    }
  }

  const body =
    refund && refund.refundMoco > 0
      ? t("m.boost.cancel_body", {
          used: String(refund.usedDays),
          total: String(refund.totalDays),
          refund: String(refund.refundMoco),
        })
      : t("m.boost.cancel_no_refund");

  return (
    <KeyboardSheet visible={visible} onClose={onClose} sheetStyle={{ backgroundColor: colors.surfaceRaised }}>
      <Text style={styles.title}>{t("m.boost.cancel_title")}</Text>
      {loading ? (
        <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />
      ) : (
        <Text style={styles.body}>{body}</Text>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <FolkButton label={t("m.common.close")} variant="ghost" onPress={onClose} />
        <FolkButton
          label={busy ? t("m.boost.cancel_busy") : t("m.boost.cancel_submit")}
          onPress={() => void submit()}
          loading={busy}
          disabled={loading}
        />
      </View>
    </KeyboardSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8 },
    body: { fontSize: 14, lineHeight: 20, color: colors.textMuted, marginBottom: spacing.md },
    error: { color: colors.terracotta, fontSize: 13, marginBottom: 8 },
    actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: spacing.sm },
  });
}
