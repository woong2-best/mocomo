import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View, Modal, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchOnDemandWithdrawQuote,
  submitOnDemandWithdraw,
  type OnDemandWithdrawQuote,
} from "@/api/settlement-on-demand";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";

function newIdempotencyKey() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatUsd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  settlementMoco: number;
  bankReady: boolean;
};

export function SettlementOnDemandWithdrawPanel({ settlementMoco, bankReady }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [debouncedMoco, setDebouncedMoco] = useState(0);
  const [quote, setQuote] = useState<OnDemandWithdrawQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tierConfirm, setTierConfirm] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const requestedMoco = useMemo(() => {
    const n = Number(amount.replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.floor(n) : 0;
  }, [amount]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedMoco(requestedMoco), 300);
    return () => clearTimeout(t);
  }, [requestedMoco]);

  useEffect(() => {
    setTierConfirm(false);
    if (debouncedMoco <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setLoadingQuote(true);
    void fetchOnDemandWithdrawQuote(debouncedMoco)
      .then((q) => {
        if (!cancelled) {
          setQuote(q);
          setQuoteError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(e instanceof Error ? e.message : "Quote failed");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingQuote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedMoco]);

  async function executeWithdraw() {
    if (requestedMoco <= 0 || !quote) return;
    setBusy(true);
    try {
      const key = newIdempotencyKey();
      const result = await submitOnDemandWithdraw(requestedMoco, key);
      showIslandSuccess(
        "Withdrawal submitted",
        `Transfer ${result.stripeTransferId.slice(0, 12)}…`,
      );
      setAmount("");
      setQuote(null);
      void queryClient.invalidateQueries({ queryKey: ["mobile-settlement-status"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["settlement-history"] });
    } catch (e: unknown) {
      showIslandError("Withdrawal failed", e instanceof Error ? e.message : "Could not withdraw");
    } finally {
      setBusy(false);
      setShowModal(false);
    }
  }

  function onPressSubmit() {
    if (!quote || !bankReady) return;
    if (quote.tierDowngrade && !tierConfirm) {
      setShowModal(true);
      return;
    }
    void executeWithdraw();
  }

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>Reward on-demand withdraw</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        {settlementMoco.toLocaleString()} MOCO available
      </Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="MOCO amount"
        keyboardType="number-pad"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { borderColor: colors.hairline, color: colors.text }]}
      />
      {loadingQuote ? <Text style={[styles.body, { color: colors.textMuted }]}>Calculating…</Text> : null}
      {quoteError ? <Text style={[styles.body, { color: colors.danger }]}>{quoteError}</Text> : null}
      {quote ? (
        <View style={[styles.quoteBox, { borderColor: colors.hairline }]}>
          <Text style={[styles.quoteLine, { color: colors.textMuted }]}>
            Gross {formatUsd(quote.faceValueCents)}
          </Text>
          <Text style={[styles.quoteLine, { color: colors.textMuted }]}>
            Platform fee −{quote.platformFeePercent}%
          </Text>
          <Text style={[styles.quoteLine, { color: colors.text, fontWeight: "800" }]}>
            Net {formatUsd(quote.transfer.netMinor)}
          </Text>
        </View>
      ) : null}
      {!bankReady ? (
        <Text style={[styles.body, { color: colors.danger }]}>Complete Stripe Connect first.</Text>
      ) : (
        <FolkButton
          label={busy ? "Processing…" : "Withdraw"}
          onPress={onPressSubmit}
          loading={busy}
          disabled={!quote || requestedMoco <= 0}
        />
      )}

      <Modal visible={showModal && !!quote?.tierDowngrade} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surfaceRaised, borderColor: colors.hairline }]}>
            <Text style={[styles.modalTitle, { color: colors.danger }]}>Tier downgrade warning</Text>
            <Text style={[styles.body, { color: colors.text }]}>
              Withdrawing {quote?.withdrawMoco.toLocaleString()} MOCO lowers balance to{" "}
              {quote?.balanceAfterMoco.toLocaleString()} MOCO ({quote?.activeTierBefore} →{" "}
              {quote?.activeTierAfter}). Future payout fee {quote?.activeTierBeforeFeePercent}% →{" "}
              {quote?.activeTierAfterFeePercent}%.
            </Text>
            <Pressable onPress={() => setTierConfirm((v) => !v)} style={styles.checkRow}>
              <Text style={{ color: colors.text }}>{tierConfirm ? "☑" : "☐"} I understand my tier will downgrade</Text>
            </Pressable>
            <View style={styles.modalActions}>
              <FolkButton label="Cancel" variant="ghost" onPress={() => setShowModal(false)} />
              <FolkButton
                label="Confirm"
                onPress={() => void executeWithdraw()}
                disabled={!tierConfirm || busy}
                loading={busy}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    box: {
      borderWidth: 1,
      borderRadius: 16,
      padding: spacing.md,
      marginHorizontal: spacing.md,
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    heading: { fontSize: 16, fontWeight: "900" },
    body: { fontSize: 12, fontWeight: "600" },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: 15,
      fontWeight: "600",
    },
    quoteBox: { borderWidth: 1, borderRadius: 12, padding: spacing.sm, gap: 4 },
    quoteLine: { fontSize: 12, fontWeight: "600" },
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalCard: { borderWidth: 1, borderRadius: 16, padding: spacing.md, gap: spacing.sm },
    modalTitle: { fontSize: 15, fontWeight: "900" },
    checkRow: { paddingVertical: spacing.xs },
    modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm },
  });
}
