import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchSponsoredAdStatus, purchaseEventSponsoredAd } from "@/api/sponsored-ad";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import { eventsUi } from "@/features/events/events-ui";

type Props = {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function EventSponsorAdSheet({ visible, eventId, onClose, onSuccess }: Props) {
  const { t } = useI18n();
  const copy = useMemo(() => eventsUi(t), [t]);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [days, setDays] = useState(3);
  const [loading, setLoading] = useState(false);
  const [quoteMoco, setQuoteMoco] = useState<number | null>(null);
  const [balance, setBalance] = useState(0);
  const [canAfford, setCanAfford] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    setError("");
    void fetchSponsoredAdStatus(eventId, days)
      .then((s) => {
        setQuoteMoco(s.quoteMoco);
        setBalance(s.purchasedMocoBalance);
        setCanAfford(s.canAfford);
      })
      .catch(() => setError(copy.quoteLoadFail))
      .finally(() => setLoading(false));
  }, [visible, eventId, days]);

  async function purchase() {
    setBusy(true);
    setError("");
    try {
      await purchaseEventSponsoredAd(eventId, days);
      onSuccess?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.purchaseFail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={styles.title}>{copy.sponsorTitle}</Text>
          <Text style={styles.sub}>{copy.sponsorSub}</Text>

          <View style={styles.dayRow}>
            {[1, 3, 7, 14].map((d) => (
              <Pressable
                key={d}
                style={[styles.dayChip, days === d && styles.dayChipActive]}
                onPress={() => setDays(d)}
              >
                <Text style={[styles.dayText, days === d && styles.dayTextActive]}>{copy.days(d)}</Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />
          ) : (
            <>
              <Text style={styles.quote}>
                {copy.quote(quoteMoco != null ? `${quoteMoco.toLocaleString()} MOCO` : "–")}
              </Text>
              <Text style={styles.balance}>{copy.balance(balance)}</Text>
              {canAfford === false ? (
                <Text style={styles.error}>{copy.insufficientMoco}</Text>
              ) : null}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <FolkButton label={copy.close} variant="ghost" onPress={onClose} />
            <FolkButton
              label={busy ? copy.purchaseBusy : copy.purchase}
              onPress={() => void purchase()}
              loading={busy}
              disabled={loading || canAfford === false}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
    sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, gap: 10 },
    title: { fontSize: 20, fontWeight: "900", color: colors.text },
    sub: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    dayRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
    dayChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dayChipActive: { backgroundColor: colors.cobalt, borderColor: colors.cobalt },
    dayText: { fontWeight: "800", color: colors.text, fontSize: 13 },
    dayTextActive: { color: colors.textOnAccent },
    quote: { fontWeight: "800", fontSize: 16, color: colors.text },
    balance: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
    error: { color: colors.danger, fontWeight: "700", fontSize: 13 },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  });
}
