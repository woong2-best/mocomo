"use client";

import { cn } from "@/lib/utils";

type Props = {
  withdrawable: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingPayout: number;
  bankLabel?: string | null;
};

function won(n: number) {
  return `${n.toLocaleString("ko-KR")}원`;
}

export function WalletCardStack({
  withdrawable,
  totalEarned,
  totalWithdrawn,
  pendingPayout,
  bankLabel,
}: Props) {
  return (
    <div className="relative mx-auto w-full max-w-md pt-6 pb-2" style={{ minHeight: 280 }}>
      <div
        className="absolute left-4 right-4 top-0 h-44 rounded-3xl bg-gradient-to-br from-[#2a3550] to-[#111827] shadow-lg border border-white/10"
        style={{ transform: "translateY(0px) scale(0.92)", zIndex: 1 }}
      >
        <div className="p-5 flex flex-col justify-between h-full">
          <p className="text-xs text-white/60 font-semibold tracking-wide">MoCoMo Settlement</p>
          <p className="text-white/80 text-sm">누적 출금 {won(totalWithdrawn)}</p>
        </div>
      </div>

      <div
        className="absolute left-3 right-3 top-4 h-44 rounded-3xl bg-gradient-to-br from-[#D4A63A] to-[#C5522A] shadow-lg border border-white/15"
        style={{ transform: "translateY(12px) scale(0.96)", zIndex: 2 }}
      >
        <div className="p-5 flex flex-col justify-between h-full">
          <p className="text-xs text-white/80 font-semibold">총 수익</p>
          <p className="text-2xl font-black text-white tracking-tight">{won(totalEarned)}</p>
          {pendingPayout > 0 ? (
            <p className="text-xs text-white/85">출금 처리 중 {won(pendingPayout)}</p>
          ) : (
            <p className="text-xs text-white/85">Stripe 정산 · 즉시 결제 수익</p>
          )}
        </div>
      </div>

      <div
        className="relative mx-1 mt-8 h-48 rounded-3xl bg-gradient-to-br from-[#1B4A8C] via-[#2E4A8E] to-[#163a72] shadow-xl border border-white/20 overflow-hidden"
        style={{ zIndex: 3 }}
      >
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="absolute right-6 bottom-6 text-white/25 text-4xl font-black">MoCo</div>
        <div className="relative p-6 flex flex-col justify-between h-full">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-white/70 font-semibold">출금 가능 잔액</p>
              <p className="text-3xl font-black text-white mt-1 tracking-tight">{won(withdrawable)}</p>
            </div>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white/90">
              CREATOR
            </span>
          </div>
          <p className="text-xs text-white/75 truncate">{bankLabel ?? "출금 계좌 미등록 · 아래에서 등록"}</p>
        </div>
      </div>
    </div>
  );
}

type StripProps = {
  title: string;
  subtitle?: string;
  right?: string;
  tone?: "cobalt" | "terracotta" | "forest" | "muted";
  className?: string;
};

export function WalletMembershipStrip({ title, subtitle, right, tone = "muted", className }: StripProps) {
  const tones = {
    cobalt: "from-[#1B4A8C] to-[#2E4A8E]",
    terracotta: "from-[#C5522A] to-[#a84324]",
    forest: "from-[#2d6a4f] to-[#1b4332]",
    muted: "from-[#4b5563] to-[#374151]",
  };
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r px-4 py-3.5 text-white shadow-sm border border-white/10",
        tones[tone],
        className
      )}
    >
      <div className="min-w-0">
        <p className="font-bold truncate">{title}</p>
        {subtitle ? <p className="text-xs text-white/80 truncate mt-0.5">{subtitle}</p> : null}
      </div>
      {right ? <p className="text-xs font-semibold text-white/90 shrink-0">{right}</p> : null}
    </div>
  );
}
