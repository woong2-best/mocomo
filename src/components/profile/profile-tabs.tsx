"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProfileTab } from "@/lib/profile-queries";
import { ProfileCreatePanel } from "@/components/profile/profile-create-panel";
import { ProfileFeedControls } from "@/components/profile/profile-feed-controls";
import { Button } from "@/components/ui/button";

const tabs: { id: ProfileTab; label: string }[] = [
  { id: "posts", label: "게시물" },
  { id: "replies", label: "답글" },
  { id: "media", label: "미디어" },
  { id: "wiki", label: "위키" },
  { id: "likes", label: "좋아요" },
];

export function ProfileTabs({
  username,
  showLikesTab = false,
  isSelf = false,
}: {
  username: string;
  showLikesTab?: boolean;
  isSelf?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = (searchParams.get("tab") as ProfileTab) || "posts";
  const base = `/u/${username}`;
  const [createOpen, setCreateOpen] = useState(false);

  function tabHref(tabId: ProfileTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tabId === "posts") {
      params.delete("tab");
      params.delete("kind");
    } else {
      params.set("tab", tabId);
      if (tabId === "media" && !params.get("kind")) params.set("kind", "photo");
      if (tabId !== "media") params.delete("kind");
    }
    const q = params.toString();
    return q ? `${base}?${q}` : base;
  }

  return (
    <>
      <nav className="flex items-stretch border-b border-border/60 sticky top-[calc(3.5rem+3.25rem)] z-10 bg-background/95 backdrop-blur-md">
        <div className="flex flex-1 min-w-0">
          {tabs.filter((t) => showLikesTab || t.id !== "likes").map((t) => {
            const href = tabHref(t.id);
            const isActive = pathname === base && active === t.id;
            return (
              <Link
                key={t.id}
                href={href}
                className={cn(
                  "flex-1 py-4 text-center text-sm font-medium hover:bg-muted/40 transition-colors relative min-w-0",
                  isActive && "font-bold"
                )}
              >
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
        {isSelf && (
          <div className="flex items-center px-3 border-l border-border/60 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={createOpen ? "secondary" : "default"}
              className="rounded-full gap-1.5 h-9 px-4"
              onClick={() => setCreateOpen((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        )}
      </nav>

      {isSelf && (
        <ProfileCreatePanel open={createOpen} onOpenChange={setCreateOpen} />
      )}

      <ProfileFeedControls username={username} tab={active} />
    </>
  );
}
