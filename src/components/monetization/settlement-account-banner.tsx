"use client";

import { AlertTriangle, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { walletSettlementPath } from "@/lib/settlement-account";
import { cn } from "@/lib/utils";

type Props = {
  callbackUrl?: string;
  className?: string;
  message?: string;
};

/** 유료 판매·정산 전 — 수익 입금 계좌 미등록 안내 (탭 시 지갑 수익 탭) */
export function SettlementAccountBanner({
  callbackUrl,
  className,
  message = "계좌를 등록해주세요",
}: Props) {
  const router = useRouter();
  const href = walletSettlementPath(callbackUrl);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-2xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-left",
        "transition-colors hover:bg-red-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40",
        className
      )}
      aria-label={`${message}. 지갑으로 이동`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-red-700 dark:text-red-300">{message}</span>
        <span className="block text-xs text-red-700/75 dark:text-red-300/75">
          지갑 → 수익 탭에서 1원 인증으로 등록
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-red-600/70 dark:text-red-400/70" aria-hidden />
    </button>
  );
}
