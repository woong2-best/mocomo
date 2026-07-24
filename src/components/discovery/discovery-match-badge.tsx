"use client";

import { useEffect, useState } from "react";
import { getDiscoveryMatchCount } from "@/actions/discovery";
import { cn } from "@/lib/utils";

export function DiscoveryMatchBadge({ className }: { className?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      void getDiscoveryMatchCount()
        .then((n) => {
          if (active) setCount(n);
        })
        .catch(() => {});
    };
    refresh();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span
      className={cn(
        "absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 px-1 rounded-full bg-folk-terracotta text-[9px] font-bold text-white flex items-center justify-center leading-none",
        className
      )}
      aria-label={`새 매칭 ${count}건`}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
