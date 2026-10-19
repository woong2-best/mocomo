import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  fetchOnDemandWithdrawQuote,
  submitOnDemandWithdraw,
  type OnDemandWithdrawQuote,
} from "@/api/settlement-on-demand";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";
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
};

export function SettlementOnDemandWithdrawPanel({ settlementMoco }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<OnDemandWithdrawQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingQuote(true);
    void fetchOnDemandWithdrawQuote()
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
  }, [settlementMoco, refreshKey]);

  async function executeWithdraw() {
    if (!quote) return;
    setBusy(true);
    try {
      const key = newIdempotencyKey();
      const result = await submitOnDemandWithdraw(key);
      showIslandSuccess("Payout requested", result.payoutRequestId);
      setRefreshKey((n) => n + 1);
      void queryClient.invalidateQueries({ queryKey: ["mobile-settlement-status"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["settlement-history"] });
    } catch (e: unknown) {
      showIslandError("Withdrawal failed", e instanceof Error ? e.message : "Could not withdraw");
    } finally {
      setBusy(false);
    }
  }

  const payoutCents = quote?.transfer.currency === "usd" ? quote.transfer.netMinor : quote?.netTransferCents;

  return (
    <View style={[styles.box, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
      <Text style={[styles.heading, { color: colors.text }]}>On-demand Reward withdrawal</Text>
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Available {settlementMoco.toLocaleString()} MOCO
      </Text>
      {loadingQuote ? <Text style={[styles.body, { color: colors.textMuted }]}>Calculating…</Text> : null}
      {quoteError ? <Text style={[styles.body, { color: colors.danger }]}>{quoteError}</Text> : null}
      {quote && payoutCents != null ? (
        <View style={[styles.quoteBox, { borderColor: colors.hairline }]}>
          <Text style={[styles.quoteLine, { color: colors.text }]}>{quote.payoutTier}</Text>
          <Text style={[styles.quoteLine, { color: colors.textMuted }]}>
            Cash out {quote.withdrawMoco.toLocaleString()} MOCO
          </Text>
          <Text style={[styles.quoteLine, { color: colors.text, fontWeight: "800" }]}>
            Payout {formatUsd(payoutCents)}
          </Text>
          <Text style={[styles.quoteLine, { color: colors.textMuted }]}>
            {quote.balanceAfterMoco.toLocaleString()} MOCO stays in your balance
          </Text>
        </View>
      ) : null}
      <FolkButton
        label={busy ? "Processing…" : "Request payout"}
        onPress={() => void executeWithdraw()}
        loading={busy}
        disabled={!quote}
      />
      <Text style={[styles.body, { color: colors.textMuted }]}>
        Pulse (10 MOCO, $47.25) is the minimum. Payouts are sent manually after your tax form is verified.
      </Text>
    </View>
  );
}

function createStyles() {
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
    quoteBox: { borderWidth: 1, borderRadius: 12, padding: spacing.sm, gap: 4 },
    quoteLine: { fontSize: 12, fontWeight: "600" },
  });
}
