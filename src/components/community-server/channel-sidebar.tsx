"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
  Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityChannelType } from "@prisma/client";
import type { CommunityChannelView } from "@/lib/community-server/types";
import { Button } from "@/components/ui/button";
import { ChannelCreateDialog } from "@/components/community-server/channel-create-dialog";
import { CommunitySidebarBanner } from "@/components/community-server/community-sidebar-banner";

const CHANNEL_ICONS: Record<CommunityChannelType, typeof Hash> = {
  POSTS: MessageSquare,
  TEXT: Hash,
  VOICE: Volume2,
  VIDEO: Video,
  LIVE: Radio,
  ANNOUNCEMENT: Megaphone,
  EVENT: Calendar,
  ACTIVITY: Gamepad2,
  QA: HelpCircle,
  GALLERY: Images,
  FILE: FileText,
  MEMBERS: Users,
  SETTINGS: Settings,
};

function groupChannels(channels: CommunityChannelView[]) {
  const visible = channels
    .filter((ch) => ch.type !== "VIDEO")
    .map((ch) =>
      ch.type === "VOICE"
        ? { ...ch, name: ch.name === "음성 채널" ? "음성/영상" : ch.name }
        : ch
    );
  const groups = new Map<string, CommunityChannelView[]>();
  for (const ch of visible) {
    const key = ch.type === "VOICE" ? "음성" : (ch.categoryName ?? "채널");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(ch);
  }
  return [...groups.entries()];
}

export function ChannelSidebar({
  slug,
  communityId,
  communityName,
  bannerUrl,
  bannerVideoUrl,
  channels,
  isOwner,
  canManageChannels,
  canAccessSettings,
}: {
  slug: string;
  communityId: string;
  communityName: string;
  bannerUrl: string | null;
  bannerVideoUrl: string | null;
  channels: CommunityChannelView[];
  isOwner: boolean;
  canManageChannels: boolean;
  canAccessSettings?: boolean;
}) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const groups = groupChannels(channels);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <aside className="flex flex-col w-14 sm:w-60 shrink-0 bg-muted/40 border-r border-border/60 h-full min-h-0">
        <div className="shrink-0 px-2 sm:px-3 py-3 border-b border-border/50">
          <Link href={base} className="flex items-center gap-2 min-w-0 group justify-center sm:justify-start">
            <span className="font-semibold truncate group-hover:underline hidden sm:inline">
              {communityName}
            </span>
            <span className="sm:hidden font-bold text-sm truncate max-w-[2.5rem]">
              {communityName[0]}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground hidden sm:block" />
          </Link>
        </div>

        <CommunitySidebarBanner
          communityId={communityId}
          bannerUrl={bannerUrl}
          bannerVideoUrl={bannerVideoUrl}
        />

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-1 sm:p-2 space-y-4">
            {groups.map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center justify-between px-1 sm:px-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hidden sm:inline">
                    {category}
                  </span>
                  {canManageChannels && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground mx-auto sm:mx-0"
                      aria-label="채널 추가"
                      onClick={() => setCreateOpen(true)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <ul className="space-y-0.5">
                  {items.map((ch) => {
                    const href = `${base}/${ch.slug}`;
                    const active = pathname === href || (pathname === base && ch.isDefault);
                    const Icon = CHANNEL_ICONS[ch.type] ?? Hash;
                    const hideSettings = ch.type === "SETTINGS" && !isOwner && !canAccessSettings;
                    if (hideSettings) return null;

                    return (
                      <li key={ch.id}>
                        <Link
                          href={href}
                          title={ch.name}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm group justify-center sm:justify-start",
                            active
                              ? "bg-primary/15 text-foreground font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-70" />
                          <span className="truncate flex-1 hidden sm:inline">{ch.name}</span>
                          {ch.isLocked && (
                            <span className="text-[10px] hidden sm:inline">🔒</span>
                          )}
                          {(ch.unreadCount ?? 0) > 0 && (
                            <span className="text-[10px] bg-destructive text-destructive-foreground rounded-full px-1.5 min-w-[18px] text-center hidden sm:inline">
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

        <div className="shrink-0 p-2 border-t border-border/50 hidden sm:block">
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs" asChild>
            <Link href="/communities">← 커뮤니티 목록</Link>
          </Button>
        </div>
      </aside>

      <ChannelCreateDialog
        communityId={communityId}
        communitySlug={slug}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
