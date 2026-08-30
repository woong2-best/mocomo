"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageSquare, PenSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SupportTierLevel } from "@prisma/client";
import { getConversationMeta, formatChatListTime } from "@/lib/chat-display";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import {
  CreatorMarketingDialog,
  CreatorMarketingHeaderButton,
} from "@/components/messages/creator-marketing-dialog";
import { cn } from "@/lib/utils";

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
  const { isNativeApp } = useClientPlatform();
  const [marketingOpen, setMarketingOpen] = useState(false);

  return (
    <aside
      className={cn(
        "w-full md:w-[340px] lg:w-[360px] border-r border-border/60 flex flex-col shrink-0 bg-background",
        className
      )}
    >
      <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-2 shrink-0">
        {isNativeApp ? (
          <>
            <CreatorMarketingHeaderButton onClick={() => setMarketingOpen(true)} />
            <h1 className="font-bold text-lg tracking-tight flex-1 text-center">메시지</h1>
            <Button asChild size="icon" variant="ghost" className="rounded-full h-9 w-9 shrink-0">
              <Link href="/messages/new" aria-label="새 메시지">
                <PenSquare className="h-5 w-5" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 min-w-0">
              <CreatorMarketingHeaderButton onClick={() => setMarketingOpen(true)} />
              <h1 className="font-bold text-lg tracking-tight">메시지</h1>
            </div>
            <Button asChild size="icon" variant="ghost" className="rounded-full h-9 w-9 shrink-0">
              <Link href="/messages/new" aria-label="새 메시지">
                <PenSquare className="h-5 w-5" />
              </Link>
            </Button>
          </>
        )}
      </div>
      <CreatorMarketingDialog open={marketingOpen} onOpenChange={setMarketingOpen} />

      <div className={cn("flex-1 overflow-y-auto min-h-0", isNativeApp && "pb-native-fab")}>
        {rooms.length === 0 ? (
          <div className={cn("p-8 text-center space-y-4", isNativeApp && "pb-native-fab")}>
            <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
              <MessageSquare className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              아직 대화가 없어요.
              <br />
              친구에게 첫 메시지를 보내 보세요.
            </p>
            <Button asChild className="rounded-full">
              <Link href="/messages/new">새 메시지</Link>
            </Button>
          </div>
        ) : (
          <ul className="py-1">
            {rooms.map((room) => {
              const meta = getConversationMeta(room, currentUserId);
              const active = activeRoomId === room.id;
              return (
                <li key={room.id}>
                  <Link
                    href={`/messages/${room.id}`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 transition-colors",
                      active ? "bg-accent/70" : "hover:bg-muted/60"
                    )}
                  >
                    <Avatar className="h-12 w-12 shrink-0 ring-1 ring-border/40">
                      <AvatarImage src={meta.displayImage ?? undefined} />
                      <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-violet-500/30 to-pink-500/30">
                        {meta.displayName[0]?.toUpperCase() ?? "?"}
                      </AvatarFallback>
                    </Avatar>
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
                            {formatChatListTime(meta.lastMessageAt)}
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
