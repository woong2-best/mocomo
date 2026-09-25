"use client";

import { useEffect, useState } from "react";
import { formatLocalClock } from "@/lib/i18n/timezone";

export function PeerLocalClock({
  timeZone,
  label,
  className,
}: {
  timeZone?: string | null;
  label?: string;
  className?: string;
}) {
  const [clock, setClock] = useState(() =>
    timeZone ? formatLocalClock(timeZone) : ""
  );

  useEffect(() => {
    if (!timeZone) {
      setClock("");
      return;
    }
    const tick = () => setClock(formatLocalClock(timeZone));
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [timeZone]);

  if (!timeZone || !clock) return null;
  return (
    <span className={className}>
      {label ? `${label} ${clock}` : clock}
    </span>
  );
}

export function PeerMemberClocks({
  members,
  className,
}: {
  members: { id: string; name: string; timeZone?: string | null }[];
  className?: string;
}) {
  const withTz = members.filter((m) => m.timeZone);
  if (withTz.length === 0) return null;
  return (
    <span className={className}>
      {withTz.map((m, i) => (
        <span key={m.id}>
          {i > 0 ? " · " : null}
          <PeerLocalClock timeZone={m.timeZone} label={m.name} />
        </span>
      ))}
    </span>
  );
}
