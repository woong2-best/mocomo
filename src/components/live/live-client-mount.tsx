"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Render children only after mount so session/HTML cannot mismatch during hydration. */
export function LiveClientMount({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) {
    return (
      <div
        className={className ?? "h-full min-h-[360px] rounded-xl border border-border/60 bg-muted/20"}
      />
    );
  }
  return children;
}
