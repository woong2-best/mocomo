"use client";

import { cn } from "@/lib/utils";

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
