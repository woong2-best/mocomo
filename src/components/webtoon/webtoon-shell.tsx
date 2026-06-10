"use client";

import { WebtoonAccessGate } from "@/components/webtoon/webtoon-access-gate";
import { WebtoonProtectionShell } from "@/components/webtoon/webtoon-protection-shell";

export function WebtoonShell({
  hasAccess,
  children,
}: {
  hasAccess: boolean;
  children: React.ReactNode;
}) {
  if (!hasAccess) return <WebtoonAccessGate />;
  return <WebtoonProtectionShell>{children}</WebtoonProtectionShell>;
}
