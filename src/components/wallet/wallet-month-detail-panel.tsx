"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";
import type { WalletEnrichedTransaction } from "@/lib/wallet-analytics";
import {
  EARNING_CATEGORY_LABELS,
  INCOME_CATEGORIES,
  type EarningCategory,
} from "@/lib/wallet-earning-categories";

type Props = {
  year: number;
  month: number | null;
  monthLabel: string;
  transactions: WalletEnrichedTransaction[];
  onClose: () => void;
};

function formatRowDate(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}:${ss}`;
}

function groupByCategory(items: WalletEnrichedTransaction[]) {
  const groups: Record<EarningCategory, WalletEnrichedTransaction[]> = {
    MARKET_CREATOR: [],
    LIVE: [],
    MEMBERSHIP: [],
    WITHDRAWAL: [],
    OTHER: [],
  };
  for (const tx of items) {
    groups[tx.category].push(tx);
  }
  for (const key of Object.keys(groups) as EarningCategory[]) {
    groups[key].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }
  return groups;
}

function TransactionRow({ tx }: { tx: WalletEnrichedTransaction }) {
  const isIncome = tx.net > 0;
  const title =
    tx.category === "WITHDRAWAL"
      ? "출금"
      : tx.label || EARNING_CATEGORY_LABELS[tx.category];
  const subtitle =
    tx.category === "WITHDRAWAL"
      ? "출금 신청"
      : tx.payerUsername
        ? `@${tx.payerUsername}`
        : "전자지급";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start justify-between gap-3 py-3.5 border-b border-border/35 last:border-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground tabular-nums tracking-tight">{formatRowDate(tx.at)}</p>
        <p className="text-[15px] font-bold text-foreground mt-0.5 truncate">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
      </div>
      <div className="text-right shrink-0 pt-4">
        <p
          className={cn(
            "text-[15px] font-black tabular-nums",
            isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}
        >
          {isIncome ? "" : "-"}
          {formatUsd(Math.abs(tx.net))}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
          잔액 {formatUsd(tx.cumulative)}
        </p>
      </div>
    </motion.div>
  );
}

function CategoryBlock({
  category,
  items,
}: {
  category: EarningCategory;
  items: WalletEnrichedTransaction[];
}) {
  if (items.length === 0) return null;
  const earned = items.filter((t) => t.net > 0).reduce((s, t) => s + t.net, 0);
  const spent = items.filter((t) => t.net < 0).reduce((s, t) => s + -t.net, 0);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="rounded-2xl border border-border/50 bg-background/40 overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border/40 bg-muted/25">
        <p className="text-[11px] font-black tracking-[0.14em] text-foreground/80">
          {EARNING_CATEGORY_LABELS[category]}
        </p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {earned > 0 ? (
            <span className="text-emerald-600 font-bold mr-2">+{formatUsd(earned)}</span>
          ) : null}
          {spent > 0 ? <span className="text-red-600 font-bold">-{formatUsd(spent)}</span> : null}
          {earned === 0 && spent === 0 ? `${items.length}건` : null}
        </p>
      </div>
      <div className="px-4 max-h-56 overflow-y-auto overscroll-contain">
        {items.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </div>
    </motion.section>
  );
}

export function WalletMonthDetailPanel({ year, month, monthLabel, transactions, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const monthTx =
    month == null
      ? []
      : transactions.filter((t) => {
          const d = new Date(t.at);
          return d.getFullYear() === year && d.getMonth() + 1 === month;
        });

  const groups = groupByCategory(monthTx);
  const incomeTotal = monthTx.filter((t) => t.net > 0).reduce((s, t) => s + t.net, 0);
  const expenseTotal = monthTx.filter((t) => t.net < 0).reduce((s, t) => s + -t.net, 0);

  useEffect(() => {
    if (month == null) return;
    const t = window.setTimeout(() => {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [month, year]);

  return (
    <AnimatePresence mode="wait">
      {month != null ? (
        <motion.div
          key={`${year}-${month}`}
          ref={panelRef}
          initial={{ opacity: 0, height: 0, y: -12 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: -8 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-border/60 bg-card/95 shadow-[0_12px_40px_-18px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border/50">
              <div>
                <p className="text-sm font-black tracking-tight">
                  {year}년 {monthLabel} 거래 내역
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  수익{" "}
                  <span className="text-emerald-600 font-bold tabular-nums">{formatUsd(incomeTotal)}</span>
                  {" · "}
                  지출{" "}
                  <span className="text-red-600 font-bold tabular-nums">{formatUsd(expenseTotal)}</span>
                  {" · "}
                  {monthTx.length}건
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold px-3 py-1.5 rounded-full border border-border/60 hover:bg-muted/50 active:scale-95 transition-all"
              >
                닫기
              </button>
            </div>

            <div className="p-3 space-y-3 max-h-[min(72vh,560px)] overflow-y-auto overscroll-contain">
              {monthTx.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">이 달 금융 거래가 없습니다.</p>
              ) : (
                <>
                  {INCOME_CATEGORIES.map((cat) => (
                    <CategoryBlock key={cat} category={cat} items={groups[cat]} />
                  ))}
                  <CategoryBlock category="WITHDRAWAL" items={groups.WITHDRAWAL} />
                  <CategoryBlock category="OTHER" items={groups.OTHER} />
                </>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
