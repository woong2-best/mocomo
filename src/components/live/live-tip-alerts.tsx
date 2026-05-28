"use client";

import { useEffect, useRef, useState } from "react";
import { Gem } from "lucide-react";
import { OreIcon } from "@/components/support/ore-icon";
import { tierFromAmount } from "@/lib/tiers";

export type LiveTipAlert = {
  id: string;
  amount: number;
  message: string | null;
  username: string;
  at: number;
};

export function LiveTipAlerts({ tips }: { tips: LiveTipAlert[] }) {
  const seenRef = useRef<Set<string>>(new Set());
  const [visible, setVisible] = useState<LiveTipAlert[]>([]);

  useEffect(() => {
    const fresh = tips.filter((t) => !seenRef.current.has(t.id));
    if (fresh.length === 0) return;
    fresh.forEach((t) => seenRef.current.add(t.id));
    setVisible((prev) => [...fresh, ...prev].slice(0, 3));
    const timer = setTimeout(() => {
      setVisible((prev) => prev.filter((v) => Date.now() - v.at < 12000));
    }, 12000);
    return () => clearTimeout(timer);
  }, [tips]);

  if (visible.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-4 z-40 flex flex-col gap-2 pointer-events-none max-w-xs">
      {visible.map((t) => (
        <div
          key={t.id}
          className="animate-in slide-in-from-left fade-in rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-500/90 to-red-500/90 text-white px-4 py-3 shadow-lg"
        >
          <p className="text-xs font-medium flex items-center gap-1">
            <Gem className="h-3.5 w-3.5" />
            @{t.username} · {t.amount.toLocaleString()}원
            <OreIcon tier={tierFromAmount(t.amount)} className="h-3.5 w-3.5 ml-1" />
          </p>
          {t.message && <p className="text-sm mt-1 line-clamp-2">{t.message}</p>}
        </div>
      ))}
    </div>
  );
}
