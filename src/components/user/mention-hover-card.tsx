"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileFollowButton } from "@/components/profile/profile-follow-button";
import { mentionProfileHref } from "@/lib/linkify";
import { userDisplayName } from "@/lib/user-public-select";
import { cn } from "@/lib/utils";

type CardUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio: string | null;
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  followRequested: boolean;
  postsLocked: boolean;
};

const cache = new Map<string, CardUser | "missing">();

async function loadCard(username: string): Promise<CardUser | "missing"> {
  const key = username.toLowerCase();
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(`/api/users/mention-card?username=${encodeURIComponent(username)}`, {
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as { user?: CardUser; missing?: boolean };
  const value = data.user && !data.missing ? data.user : "missing";
  cache.set(key, value);
  return value;
}

export function MentionHoverLink({
  username,
  label,
  className,
  href,
  stopPropagation,
  missing,
}: {
  username: string;
  label: string;
  className?: string;
  href: string;
  stopPropagation?: boolean;
  missing?: boolean;
}) {
  const panelId = useId();
  const wrapRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<CardUser | "missing" | null>(missing ? "missing" : null);

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  function show() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    setOpen(true);
    if (card || missing) return;
    void loadCard(username).then(setCard);
  }

  function hide() {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 160);
  }

  return (
    <span
      ref={wrapRef}
      className="relative inline"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <Link
        href={missing ? href : mentionProfileHref(`@${username}`)}
        className={className}
        aria-describedby={open ? panelId : undefined}
        onClick={
          stopPropagation
            ? (e) => {
                e.stopPropagation();
              }
            : undefined
        }
      >
        {label}
      </Link>
      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className={cn(
            "absolute left-0 top-full z-[80] mt-1 w-72 rounded-2xl border border-border bg-popover p-3 text-left shadow-xl",
            "pointer-events-auto"
          )}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          {card === "missing" || missing ? (
            <span className="block text-sm text-muted-foreground">This user doesn’t exist.</span>
          ) : card ? (
            <span className="block space-y-2">
              <span className="flex items-start gap-3">
                <Avatar className="h-12 w-12 shrink-0">
                  <AvatarImage src={card.image ?? undefined} alt="" />
                  <AvatarFallback>{card.username.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <Link
                    href={mentionProfileHref(`@${card.username}`)}
                    className="block truncate font-semibold text-foreground hover:underline"
                    onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
                  >
                    {userDisplayName(card)}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">@{card.username}</span>
                </span>
                <ProfileFollowButton
                  userId={card.id}
                  username={card.username}
                  initialFollowing={card.isFollowing}
                  initialRequested={card.followRequested}
                  postsLocked={card.postsLocked}
                  size="sm"
                />
              </span>
              {card.bio ? (
                <span className="block line-clamp-3 text-xs text-muted-foreground">{card.bio}</span>
              ) : null}
              <span className="flex gap-3 text-xs text-muted-foreground">
                <span>
                  <span className="font-semibold text-foreground">{card.followerCount}</span> followers
                </span>
                <span>
                  <span className="font-semibold text-foreground">{card.followingCount}</span> following
                </span>
              </span>
            </span>
          ) : (
            <span className="block text-sm text-muted-foreground">Loading…</span>
          )}
        </span>
      ) : null}
    </span>
  );
}
