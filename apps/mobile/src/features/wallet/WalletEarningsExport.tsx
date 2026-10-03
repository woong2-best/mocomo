import { useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { formatMocoDisplay, formatMocoNetFromCents, ledgerCentsToMoco } from "@/lib/wallet-moco-display";
import { useI18n } from "@/i18n/I18nProvider";
import type { TFn } from "@/i18n/types";

type Month = {
  month: number;
  label: string;
  earned: number;
  withdrawn: number;
  net: number;
  cumulative: number;
};

type Transaction = {
  id: string;
  at: string;
  type: string;
  amount: number;
  net: number;
  cumulative: number;
  label: string;
  memo: string | null;
  category?: string;
  payerUsername?: string | null;
};

type Props = {
  months: Month[];
  transactions: Transaction[];
  year: number;
  yearNet: number;
  colors: ThemeColors;
};

function csvCell(value: string | number | null | undefined): string {
  if (value == null || value === "") return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatKoDateTime(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}:${ss}`;
}

function buildYearSummaryCsv(
  months: Month[],
  year: number,
  t: TFn
): string {
  const header = t("m.wallet.year_month_earned_withdrawn_net_cumulati");
  const rows = months.map((m) =>
    [year, m.label, m.earned, m.withdrawn, m.net, m.cumulative].map(csvCell).join(",")
  );
  const totalEarned = months.reduce((s, m) => s + m.earned, 0);
  const totalWithdrawn = months.reduce((s, m) => s + m.withdrawn, 0);
  rows.push([t("m.common.total"), "", totalEarned, totalWithdrawn, totalEarned - totalWithdrawn, ""].map(csvCell).join(","));
  return `\uFEFF${header}\n${rows.join("\n")}`;
}

function buildTransactionsCsv(items: Transaction[], t: TFn): string {
  const header = t("m.wallet.date_type_amount_net_change_balance");
  const rows = items.map((t) =>
    [
      formatKoDateTime(t.at),
      t.label,
      t.amount,
      t.net,
      t.cumulative,
      t.payerUsername ? `@${t.payerUsername}` : "",
      t.memo ?? "",
    ]
      .map(csvCell)
      .join(",")
  );
  return `\uFEFF${header}\n${rows.join("\n")}`;
}

async function shareCsv(title: string, csv: string) {
  await Share.share({ title, message: csv });
}

export function WalletEarningsExport({ months, transactions, year, yearNet, colors }: Props) {
  const { t } = useI18n();
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const trendUp = yearNet >= 0;
  const safeMonths = months?.length === 12 ? months : [];

  const monthTx =
    selectedMonth == null
      ? []
      : transactions.filter((t) => {
          const d = new Date(t.at);
          return d.getFullYear() === year && d.getMonth() + 1 === selectedMonth;
        });

  return (
    <View style={styles.wrap}>
      <View style={[styles.panel, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
        <View style={styles.panelHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>{t("m.wallet.earnings_excel_export")}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {t("m.wallet.share_year_monthly_csv_exports", { year: String(year) })}
            </Text>
          </View>
          <Text style={[styles.trend, { color: trendUp ? colors.success : colors.danger }]}>
            {trendUp ? "▲" : "▼"} {formatMocoDisplay(ledgerCentsToMoco(yearNet ?? 0))}
          </Text>
        </View>

        <View style={styles.exportRow}>
          <Pressable
            onPress={() => void shareCsv(t("m.wallet.year_monthly_summary", { year: String(year) }), buildYearSummaryCsv(safeMonths, year, t))}
            style={[styles.primaryBtn, { backgroundColor: colors.cobalt }]}
          >
            <Text style={[styles.primaryBtnText, { color: colors.textOnAccent }]}>{t("m.wallet.year_monthly_excel", { year: String(year) })}</Text>
          </Pressable>
          <Pressable
            onPress={() => void shareCsv(t("m.wallet.year_all_transactions", { year: String(year) }), buildTransactionsCsv(transactions, t))}
            style={[styles.secondaryBtn, { borderColor: colors.hairline, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>{t("m.wallet.year_full_excel", { year: String(year) })}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.panel, { borderColor: colors.hairline, backgroundColor: colors.surfaceRaised }]}>
        <Text style={[styles.panelTitle, { color: colors.textMuted, marginBottom: spacing.sm }]}>{t("m.wallet.monthly_excel")}</Text>
        <View style={styles.monthGrid}>
          {safeMonths.map((m) => {
            const active = selectedMonth === m.month;
            const hasActivity = (m.earned ?? 0) > 0 || (m.withdrawn ?? 0) > 0;
            return (
              <View key={m.month} style={styles.monthCell}>
                <Pressable
                  onPress={() => setSelectedMonth((prev) => (prev === m.month ? null : m.month))}
                  style={[
                    styles.monthBtn,
                    {
                      borderColor: active ? colors.cobalt : colors.hairline,
                      backgroundColor: active ? colors.cobalt : hasActivity ? colors.surface : "transparent",
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "800",
                      color: active ? colors.textOnAccent : hasActivity ? colors.text : colors.textMuted,
                    }}
                  >
                    {String(m.month)}
                  </Text>
                </Pressable>
                {hasActivity ? (
                  <Pressable
                    onPress={() => {
                      const filtered = transactions.filter((t) => {
                        const d = new Date(t.at);
                        return d.getFullYear() === year && d.getMonth() + 1 === m.month;
                      });
                      void shareCsv(
                        t("m.wallet.year_label", { year: String(year), label: String(m.label) }),
                        buildTransactionsCsv(filtered, t)
                      );
                    }}
                    style={[styles.excelBtn, { borderColor: colors.hairline }]}
                  >
                    <Text style={{ fontSize: 9, fontWeight: "700", color: colors.textMuted }}>Excel</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>

        {selectedMonth != null ? (
        <View style={styles.monthDetailPanel}>
          <View style={styles.detailHeader}>
            <Text style={[styles.panelTitle, { color: colors.text }]}>
              {t("m.wallet.year_selectedmonth_length_items", { year: String(year), selectedMonth: String(selectedMonth), length: String(monthTx.length) })}
            </Text>
            <Pressable onPress={() => setSelectedMonth(null)}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>{t("common.close")}</Text>
            </Pressable>
          </View>
          {monthTx.length === 0 ? (
            <Text style={[styles.subtitle, { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md }]}>
              {t("m.wallet.no_transactions_this_month")}
            </Text>
          ) : (
            monthTx.slice(0, 20).map((tx) => (
              <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.hairline }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{formatKoDateTime(tx.at)}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 2 }}>{tx.label}</Text>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: tx.net >= 0 ? colors.success : colors.danger,
                  }}
                >
                  {formatMocoNetFromCents(tx.net)}
                </Text>
              </View>
            ))
          )}
        </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.sm,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  panelTitle: { fontSize: 13, fontWeight: "700" },
  subtitle: { fontSize: 11, marginTop: 2 },
  trend: { fontSize: 12, fontWeight: "800" },
  exportRow: { gap: spacing.sm },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 13, fontWeight: "800" },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "700" },
  monthDetailPanel: {
    marginTop: 0,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  monthCell: { width: "15%", minWidth: 44, alignItems: "center", gap: 4 },
  monthBtn: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  excelBtn: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 3,
    alignItems: "center",
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
