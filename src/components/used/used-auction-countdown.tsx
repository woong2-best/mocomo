"use client";

import { useEffect, useState } from "react";
import { formatAuctionCountdown } from "@/lib/used-auction";

export function UsedAuctionCountdown({
  endsAt,
  className = "",
}: {
  endsAt: string | Date;
  className?: string;
}) {
  const [label, setLabel] = useState(() => formatAuctionCountdown(endsAt));

  useEffect(() => {
    const tick = () => setLabel(formatAuctionCountdown(endsAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const ended = label === "마감";

  return (
    <span
      className={`tabular-nums font-semibold ${ended ? "text-muted-foreground" : "text-orange-500"} ${className}`}
    >
      {ended ? "마감됨" : label}
    </span>
  );
}
