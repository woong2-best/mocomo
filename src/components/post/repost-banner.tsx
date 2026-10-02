"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { userDisplayName } from "@/lib/user-public-select";
import { useLocale } from "@/components/providers/locale-provider";

export function RepostBanner({
  user,
}: {
  user: { username: string; name?: string | null };
}) {
  const { locale , t } = useLocale();
  const label = userDisplayName(user);
  return (
    <p className="mb-2 flex items-center gap-1.5 pl-1 text-[13px] font-medium text-muted-foreground">
      <Repeat2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <Link href={`/u/${user.username}`} className="truncate hover:underline">
        {label}
      </Link>
      <span className="shrink-0">{t("ui.reposted")}</span>
    </p>
  );
}
