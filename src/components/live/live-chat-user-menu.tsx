"use client";


import { errorText } from "@/lib/i18n/error-text";
import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  banLiveChatUserAction,
  timeoutLiveChatUserAction,
} from "@/actions/broadcast-roles";
import { deleteLiveChatMessage } from "@/actions/live-stream";
import { MoreHorizontal, User, Clock, Ban, Trash2 } from "lucide-react";
import Link from "next/link";

export function LiveChatUserMenu({
  channelId,
  userId,
  username,
  messageId,
  canModerate,
}: {
  channelId: string;
  userId: string;
  username: string;
  messageId?: string;
  canModerate?: boolean;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!canModerate) return null;

  async function run(action: () => Promise<{ error?: string; success?: true }>) {
    setBusy(true);
    setError("");
    const res = await action();
    setBusy(false);
    if ("error" in res && res.error) setError(errorText(res.error));
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          disabled={busy}
          aria-label={t("live.s52cqpl")}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{t("live.s52cqpl")}</p>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${username}`} className="flex items-center gap-2 cursor-pointer">
            <User className="h-3.5 w-3.5" />
            {t("live.s1oie40")}
          </Link>
        </DropdownMenuItem>
        {messageId && (
          <DropdownMenuItem
            onClick={() => void run(() => deleteLiveChatMessage(channelId, messageId))}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            {t("live.s2wgarb")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => void run(() => timeoutLiveChatUserAction(channelId, userId, 300))}
        >
          <Clock className="h-3.5 w-3.5 mr-2" />
          {t("live.s1gb1m50")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void run(() => timeoutLiveChatUserAction(channelId, userId, 600))}
        >
          <Clock className="h-3.5 w-3.5 mr-2" />
          {t("live.s15nidha")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => void run(() => banLiveChatUserAction(channelId, userId))}
        >
          <Ban className="h-3.5 w-3.5 mr-2" />
          {t("live.szphc")}
        </DropdownMenuItem>
        {error && <p className="px-2 py-1 text-[11px] text-destructive">{error}</p>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
