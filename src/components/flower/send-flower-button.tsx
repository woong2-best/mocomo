"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Compact entry to send Flower Gift from profile / live / post */
export function SendFlowerButton({
  username,
  context = "PROFILE",
  contextId,
}: {
  username: string;
  context?: "LIVE" | "POST" | "COMMENT" | "MESSAGE" | "PROFILE" | "DIRECT";
  contextId?: string;
}) {
  const q = new URLSearchParams({
    tab: "wallet",
    to: username,
    context,
  });
  if (contextId) q.set("contextId", contextId);

  return (
    <Button type="button" size="sm" variant="secondary" asChild>
      <Link href={`/flowers?${q.toString()}`}>🌸 Flower Gift</Link>
    </Button>
  );
}
