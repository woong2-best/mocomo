"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Hash,
  Megaphone,
  Calendar,
  HelpCircle,
  Images,
  FileText,
  Users,
  MessageSquare,
  Menu,
  Plus,
  Gamepad2,
  ChevronDown,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { CommunityChannelView } from "@/lib/community-server/types";
import type { CommunityChannelType } from "@prisma/client";
import { ChannelCreateDialog } from "@/components/community-server/channel-create-dialog";
import { cn } from "@/lib/utils";

const CHANNEL_ICONS: Record<CommunityChannelType, typeof Hash> = {
  POSTS: MessageSquare,
  TEXT: Hash,
  VOICE: Hash,
  VIDEO: Hash,
  LIVE: Hash,
  ANNOUNCEMENT: Megaphone,
  EVENT: Calendar,
  ACTIVITY: Gamepad2,
  QA: HelpCircle,
  GALLERY: Images,
  FILE: FileText,
  MEMBERS: Users,
  SETTINGS: Hash,
};

type ChannelGroup = {
  categoryId: string | null;
  categoryName: string;
  items: CommunityChannelView[];
};

function groupChannels(channels: CommunityChannelView[]): ChannelGroup[] {
  const visible = channels.filter(
    (c) =>
      c.type !== "SETTINGS" &&
      c.type !== "VOICE" &&
      c.type !== "VIDEO" &&
      c.type !== "LIVE"
  );
  const groups = new Map<string, ChannelGroup>();
  for (const ch of visible) {
    const categoryName = ch.categoryName ?? "채널";
    const key = ch.categoryId ?? categoryName;
    if (!groups.has(key)) {
      groups.set(key, { categoryId: ch.categoryId, categoryName, items: [] });
    }
    groups.get(key)!.items.push(ch);
  }
  return [...groups.values()];
}

export function MobileChannelDrawer({
  slug,
  communityId,
  communitySlug,
  channels,
  canCreateChannel,
  open,
  onOpenChange,
}: {
  slug: string;
  communityId: string;
  communitySlug: string;
  channels: CommunityChannelView[];
  canCreateChannel: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const groups = groupChannels(channels);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCategoryId, setCreateCategoryId] = useState<string | null>(null);

  function openCreate(categoryId: string | null) {
    setCreateCategoryId(categoryId);
    setCreateOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
        <span>채널</span>
      </button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="fixed left-0 top-0 h-full w-[min(100vw,18rem)] max-w-full translate-x-0 translate-y-0 rounded-none border-r p-0 gap-0">
          <div className="p-3 border-b font-semibold">채널</div>
          <div className="overflow-y-auto p-2 space-y-3 flex-1">
            {groups.map((group) => (
              <div key={group.categoryId ?? group.categoryName}>
                <div className="flex items-center justify-between px-2 mb-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                      {group.categoryName}
                    </span>
                  </div>
                  {canCreateChannel ? (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground p-1"
                      aria-label={`${group.categoryName}에 채널 추가`}
                      onClick={() => openCreate(group.categoryId)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((ch) => {
                    const href = `${base}/${ch.slug}`;
                    const active = pathname === href;
                    const Icon = CHANNEL_ICONS[ch.type] ?? Hash;
                    return (
                      <li key={ch.id}>
                        <Link
                          href={href}
                          onClick={() => onOpenChange(false)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
                            active ? "bg-primary/15 font-medium" : "hover:bg-muted"
                          )}
                        >
                          <Icon className="h-4 w-4 opacity-60" />
                          <span className="truncate flex-1">{ch.name}</span>
                          {ch.vipOnly && <span className="text-[10px]">⭐</span>}
                          {ch.isLocked && <span className="text-[10px]">🔒</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <ChannelCreateDialog
        communityId={communityId}
        communitySlug={communitySlug}
        categoryId={createCategoryId}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </>
  );
}
