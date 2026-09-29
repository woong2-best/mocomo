"use client";

import Link from "next/link";
import { Repeat2 } from "lucide-react";
import { userDisplayName } from "@/lib/user-public-select";
import { useLocale } from "@/components/providers/locale-provider";
import { uiText } from "@/lib/i18n/ui-text";

export function RepostBanner({
  user,
}: {
  user: { username: string; name?: string | null };
}) {
  const { locale } = useLocale();
  const label = userDisplayName(user);
  return (
    <p className="mb-2 flex items-center gap-1.5 pl-1 text-[13px] font-medium text-muted-foreground">
      <Repeat2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <Link href={`/u/${user.username}`} className="truncate hover:underline">
        {label}
      </Link>
      <span className="shrink-0">{uiText(locale, "님이 재게시함", " reposted")}</span>
    </p>
  );
}
