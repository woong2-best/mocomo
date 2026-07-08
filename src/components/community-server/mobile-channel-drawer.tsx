"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hash, Menu } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { CommunityChannelView } from "@/lib/community-server/types";
import { cn } from "@/lib/utils";

export function MobileChannelDrawer({
  slug,
  channels,
  open,
  onOpenChange,
}: {
  slug: string;
  channels: CommunityChannelView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  const visible = channels.filter((c) => c.type !== "VIDEO" && c.type !== "SETTINGS");

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
        <ul className="overflow-y-auto p-2 space-y-0.5">
          {visible.map((ch) => {
            const href = `${base}/${ch.slug}`;
            const active = pathname === href;
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
                  <Hash className="h-4 w-4 opacity-60" />
                  {ch.name}
                  {ch.vipOnly && <span className="text-[10px]">⭐</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  </>
  );
}
