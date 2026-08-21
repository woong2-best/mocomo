"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/money";
import { EARNING_CATEGORY_LABELS } from "@/lib/wallet-earning-categories";
import type { PaymentHistoryItem } from "@/lib/payment-history";

type Props = {
  items: PaymentHistoryItem[];
};

function formatPaidAt(d: Date) {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${y}.${m}.${day} ${hh}:${mm}:${ss}`;
}

export function PaymentHistoryPanel({ items }: Props) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50">
        <p className="font-bold">결제 내역</p>
        <p className="text-xs text-muted-foreground mt-0.5">구매한 크리에이터 · 영상 · 상품</p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground px-4 py-8 text-center">결제 내역이 없습니다.</p>
      ) : (
        <ul className="max-h-[min(70vh,480px)] overflow-y-auto overscroll-contain divide-y divide-border/40">
          {items.map((item, i) => {
            const title = item.contentTitle;
            const subtitle =
              item.creatorUsername && item.contentSubtitle !== `@${item.creatorUsername}`
                ? `@${item.creatorUsername} · ${item.contentSubtitle ?? item.typeLabel}`
                : item.contentSubtitle ?? item.typeLabel;

            const inner = (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground tabular-nums">{formatPaidAt(item.paidAt)}</p>
                  <p className="text-[15px] font-bold text-foreground mt-0.5 truncate">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                  <p className="text-[10px] font-semibold tracking-wide text-muted-foreground/80 mt-1 uppercase">
                    {EARNING_CATEGORY_LABELS[item.category] ?? item.typeLabel}
                  </p>
                </div>
                <div className="text-right shrink-0 pt-3">
                  <p className="text-[15px] font-black tabular-nums text-red-600 dark:text-red-400">
                    -{formatUsd(item.amount)}
                  </p>
                </div>
              </div>
            );

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.22 }}
                className={cn(item.href && "hover:bg-muted/20 transition-colors")}
              >
                {item.href ? (
                  <Link href={item.href} className="block px-4 py-3.5">
                    {inner}
                  </Link>
                ) : (
                  <div className="px-4 py-3.5">{inner}</div>
                )}
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
