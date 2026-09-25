import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { fetchSponsoredAdStatus, purchaseEventSponsoredAd } from "@/api/sponsored-ad";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  visible: boolean;
  eventId: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export function EventSponsorAdSheet({ visible, eventId, onClose, onSuccess }: Props) {
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
      .catch(() => setError("광고 견적을 불러오지 못했습니다."))
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
      setError(e instanceof Error ? e.message : "광고 구매에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surfaceRaised }]}>
          <Text style={styles.title}>이벤트 스폰서 광고</Text>
          <Text style={styles.sub}>웹과 동일 — MOCO로 기간 광고를 구매합니다.</Text>

          <View style={styles.dayRow}>
            {[1, 3, 7, 14].map((d) => (
              <Pressable
                key={d}
                style={[styles.dayChip, days === d && styles.dayChipActive]}
                onPress={() => setDays(d)}
              >
                <Text style={[styles.dayText, days === d && styles.dayTextActive]}>{d}일</Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />
          ) : (
            <>
              <Text style={styles.quote}>
                견적: {quoteMoco != null ? `${quoteMoco.toLocaleString()} MOCO` : "—"}
              </Text>
              <Text style={styles.balance}>구매 MOCO 잔액: {balance.toLocaleString()}</Text>
              {canAfford === false ? (
                <Text style={styles.error}>잔액이 부족합니다. mocomo.net 웹에서 MOCO를 충전해 주세요.</Text>
              ) : null}
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <FolkButton label="닫기" variant="ghost" onPress={onClose} />
            <FolkButton
              label={busy ? "처리 중…" : "광고 구매"}
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
