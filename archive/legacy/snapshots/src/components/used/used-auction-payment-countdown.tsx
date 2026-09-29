"use client";

import { useEffect, useState } from "react";
import { formatPaymentCountdown } from "@/lib/used-auction-config";

export function UsedAuctionPaymentCountdown({
  dueAt,
  className = "",
}: {
  dueAt: string | Date;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatPaymentCountdown(dueAt));

  useEffect(() => {
    const tick = () => setLabel(formatPaymentCountdown(dueAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dueAt]);

  const expired = label === "00:00:00";

  return (
    <span
      className={`tabular-nums font-bold ${expired ? "text-destructive" : "text-orange-600 dark:text-orange-400"} ${className}`}
    >
      {label}
    </span>
  );
}
