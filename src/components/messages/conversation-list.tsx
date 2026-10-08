"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SupportTierLevel } from "@prisma/client";
import { getConversationMeta, formatChatListTime } from "@/lib/chat-display";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { useAppSocket } from "@/components/providers/app-socket-provider";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/providers/locale-provider";


type Room = {
  id: string;
  type: string;
  name: string | null;
  members: {
    userId: string;
    user: {
      id: string;
      username: string;
      image: string | null;
      name?: string | null;
      supportTierSent?: SupportTierLevel;
    };
  }[];
  messages: {
    content: string | null;
    createdAt: Date;
    attachments?: { type: import("@prisma/client").MessageAttachmentType }[];
  }[];
};

export function ConversationList({
  rooms,
  currentUserId,
  activeRoomId,
  className,
}: {
  rooms: Room[];
  currentUserId: string;
  activeRoomId?: string;
  className?: string;
}) {
  const { locale, t } = useLocale();
  const pathname = usePathname() ?? "";
  const { isNativeApp } = useClientPlatform();
  const { isUserOnline } = useAppSocket();
  const activeFromPath = pathname.match(/^\/messages\/([^/]+)$/)?.[1];
  const resolvedActiveRoomId =
    activeRoomId ??
    (activeFromPath && activeFromPath !== "new" && activeFromPath !== "join"
      ? activeFromPath
      : undefined);

  return (
    <aside
      className={cn(
        "w-full md:w-[340px] lg:w-[360px] border-r border-border/60 flex flex-col shrink-0 bg-background",
        className
      )}
    >
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2 shrink-0">
        <h1 className="font-bold text-lg tracking-tight flex-1 min-w-0">{t("nav.messages")}</h1>
        <Link
          href="/settings/messages"
          className="p-2 rounded-full hover:bg-muted/80 shrink-0"
          aria-label={t("ui.message_settings")}
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <div className={cn("flex-1 overflow-y-auto min-h-0", isNativeApp && "pb-native-fab")}>
        {rooms.length === 0 ? (
          <div className={cn("p-8 text-center space-y-4", isNativeApp && "pb-native-fab")}>
            <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("ui.no_conversations_yet")}
              <br />
              {t("ui.send_someone_your_first_message")}
            </p>
            <Button asChild className="rounded-full">
              <Link href="/messages/new">{t("messages.newTitle")}</Link>
            </Button>
          </div>
        ) : (
          <ul className="py-1">
            {rooms.map((room) => {
              const meta = getConversationMeta(room, currentUserId, locale);
              const active = resolvedActiveRoomId === room.id;
              const online = meta.otherUserId ? isUserOnline(meta.otherUserId) : false;
              return (
                <li key={room.id}>
                  <Link
                    href={`/messages/${room.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      active ? "bg-accent/70" : "hover:bg-muted/60"
                    )}
                  >
                    <span className="relative shrink-0">
                      <Avatar className="h-12 w-12 ring-1 ring-border/40">
                        <AvatarImage src={meta.displayImage ?? undefined} />
                        <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-violet-500/30 to-pink-500/30">
                          {meta.displayName[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      {online ? (
                        <span
                          className="absolute right-0 bottom-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background"
                          aria-label={t("ui.online")}
                        />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <DisplayNameWithSupportTier
                          name={meta.displayName}
                          tier={meta.supportTierSent ?? "SEED"}
                          nameClassName={cn("font-semibold text-sm", active && "text-foreground")}
                          compact
                          className="min-w-0 flex-1"
                        />
                        {meta.lastMessageAt && (
                          <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                            {formatChatListTime(meta.lastMessageAt, locale)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-0.5">{meta.lastMessage}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
