"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hash,
  Volume2,
  Video,
  Radio,
  Megaphone,
  Calendar,
  HelpCircle,
  Images,
  FileText,
  Users,
  Settings,
  MessageSquare,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityChannelType } from "@prisma/client";
import type { CommunityChannelView } from "@/lib/community-server/types";
import { Button } from "@/components/ui/button";

const CHANNEL_ICONS: Record<CommunityChannelType, typeof Hash> = {
  POSTS: MessageSquare,
  TEXT: Hash,
  VOICE: Volume2,
  VIDEO: Video,
  LIVE: Radio,
  ANNOUNCEMENT: Megaphone,
  EVENT: Calendar,
  QA: HelpCircle,
  GALLERY: Images,
  FILE: FileText,
  MEMBERS: Users,
  SETTINGS: Settings,
};

function groupChannels(channels: CommunityChannelView[]) {
  // 영상 전용 채널은 사이드바에서 숨김 — 음성 채널에서 카메라 토글
  const visible = channels
    .filter((ch) => ch.type !== "VIDEO")
    .map((ch) =>
      ch.type === "VOICE"
        ? { ...ch, name: ch.name === "음성 채널" ? "음성/영상" : ch.name }
        : ch
    );
  const groups = new Map<string, CommunityChannelView[]>();
  for (const ch of visible) {
    const key =
      ch.type === "VOICE"
        ? "음성·영상"
        : ch.categoryName ?? "채널";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ch);
  }
  return [...groups.entries()];
}

export function ChannelSidebar({
  slug,
  communityName,
  channels,
  isOwner,
  canManageChannels,
}: {
  slug: string;
  communityName: string;
  channels: CommunityChannelView[];
  isOwner: boolean;
  canManageChannels: boolean;
}) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const groups = groupChannels(channels);

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-muted/40 border-r border-border/60 h-full min-h-0">
      <div className="shrink-0 px-3 py-3 border-b border-border/50">
        <Link href={base} className="flex items-center gap-2 min-w-0 group">
          <span className="font-semibold truncate group-hover:underline">{communityName}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-2 space-y-4">
          {groups.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between px-2 mb-1">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </span>
                {canManageChannels && (
                  <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="채널 추가">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <ul className="space-y-0.5">
                {items.map((ch) => {
                  const href = `${base}/${ch.slug}`;
                  const active = pathname === href || (pathname === base && ch.isDefault);
                  const Icon = CHANNEL_ICONS[ch.type] ?? Hash;
                  const hideSettings = ch.type === "SETTINGS" && !isOwner;
                  if (hideSettings) return null;

                  return (
                    <li key={ch.id}>
                      <Link
                        href={href}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm group",
                          active
                            ? "bg-primary/15 text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0 opacity-70" />
                        <span className="truncate flex-1">{ch.name}</span>
                        {(ch.unreadCount ?? 0) > 0 && (
                          <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 min-w-[18px] text-center">
                            {ch.unreadCount! > 99 ? "99+" : ch.unreadCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="shrink-0 p-2 border-t border-border/50">
        <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
          <Link href="/communities">← 커뮤니티 목록</Link>
        </Button>
      </div>
    </aside>
  );
}
