"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";
import type { WalletEnrichedTransaction, WalletMonthBucket } from "@/lib/wallet-analytics";
import { WalletMonthDetailPanel } from "@/components/wallet/wallet-month-detail-panel";
import {
  downloadTextFile,
  exportMonthTransactionsCsv,
  exportTransactionsCsv,
  exportYearSummaryCsv,
} from "@/lib/wallet-timeseries";
import { EARNING_CATEGORY_LABELS } from "@/lib/wallet-earning-categories";
import { Download, FileSpreadsheet } from "lucide-react";

type Props = {
  transactions: WalletEnrichedTransaction[];
  months: WalletMonthBucket[];
  year: number;
  yearNet: number;
  className?: string;
};

export function WalletEarningsExportPanel({
  transactions,
  months,
  year,
  yearNet,
  className,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const trendUp = yearNet >= 0;

  const enrichedRows = transactions.map((t) => ({
    ...t,
    category: EARNING_CATEGORY_LABELS[t.category],
  }));

  const selectedMonthLabel =
    selectedMonth != null ? months.find((m) => m.month === selectedMonth)?.label ?? `${selectedMonth}월` : "";

  return (
    <div className={cn("space-y-3", className)}>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">수익 내역 Excel</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {year}년 연간·월별 거래 내역을 Excel(CSV)로 내려받습니다.
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full",
              trendUp ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-700"
            )}
          >
            {trendUp ? "▲" : "▼"} {formatUsd(Math.abs(yearNet))}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `wallet-${year}-summary.csv`,
                exportYearSummaryCsv(months, year),
                "text/csv;charset=utf-8"
              )
            }
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border border-border/60 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {year}년 월별 요약 Excel
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `wallet-${year}-all.csv`,
                exportTransactionsCsv(enrichedRows, year),
                "text/csv;charset=utf-8"
              )
            }
            className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted/60 transition-colors"
          >
            <Download className="h-4 w-4" />
            {year}년 전체 거래 Excel
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 px-2 py-3 space-y-2">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-[11px] font-semibold text-muted-foreground">월별 Excel</p>
          <p className="text-[10px] text-muted-foreground">월 탭 → 상세 보기 · Excel 다운로드</p>
        </div>
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
          {months.map((m) => {
            const active = selectedMonth === m.month;
            const hasActivity = m.earned > 0 || m.withdrawn > 0;
            return (
              <div key={m.month} className="flex flex-col gap-1">
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`${m.label} 거래 내역`}
                  onClick={() => setSelectedMonth((prev) => (prev === m.month ? null : m.month))}
                  className={cn(
                    "relative flex flex-col items-center justify-center rounded-xl py-2.5 text-xs font-bold transition-all duration-200 ease-out",
                    active
                      ? "bg-primary text-primary-foreground shadow-md scale-[1.04] ring-2 ring-primary/30"
                      : hasActivity
                        ? "bg-muted/55 hover:bg-muted text-foreground hover:scale-[1.02]"
                        : "bg-transparent hover:bg-muted/30 text-muted-foreground"
                  )}
                >
                  {hasActivity ? (
                    <span
                      className={cn(
                        "absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full",
                        active ? "bg-primary-foreground" : m.net >= 0 ? "bg-emerald-500" : "bg-red-500"
                      )}
                    />
                  ) : null}
                  <span>{m.label.replace("월", "")}</span>
                  <span className="text-[9px] opacity-70 mt-0.5">월</span>
                </button>
                {hasActivity ? (
                  <button
                    type="button"
                    onClick={() =>
                      downloadTextFile(
                        `wallet-${year}-${String(m.month).padStart(2, "0")}.csv`,
                        exportMonthTransactionsCsv(enrichedRows, year, m.month),
                        "text/csv;charset=utf-8"
                      )
                    }
                    className="text-[9px] font-bold py-1 rounded-lg border border-border/50 bg-background/60 hover:bg-muted/50 text-muted-foreground"
                  >
                    Excel
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <WalletMonthDetailPanel
        year={year}
        month={selectedMonth}
        monthLabel={selectedMonthLabel}
        transactions={transactions}
        onClose={() => setSelectedMonth(null)}
      />
    </div>
  );
}
