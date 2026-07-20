"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";
import { cn } from "@/lib/utils";

export type CollabHeaderUser = {
  id: string;
  username: string;
  name?: string | null;
  image: string | null;
  supportTierSent?: SupportTierLevel;
};

export type CollabHeaderEntry = {
  id?: string;
  userId?: string;
  user: CollabHeaderUser;
};

type Props = {
  author: CollabHeaderUser;
  collaborators?: CollabHeaderEntry[] | null;
  /** Optional trailing meta (time, etc.) */
  trailing?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
  showStackedAvatars?: boolean;
};

export function PostCollaboratorsHeader({
  author,
  collaborators,
  trailing,
  size = "sm",
  className,
  showStackedAvatars = true,
}: Props) {
  const accepted = (collaborators ?? [])
    .map((c) => c.user)
    .filter(Boolean);
  const avatars = [author, ...accepted];
  const avatarSize = size === "md" ? "h-10 w-10" : "h-10 w-10";
  const stackSize = size === "md" ? "h-8 w-8" : "h-7 w-7";
  const maxVisible = 4;
  const overflow = Math.max(0, avatars.length - maxVisible);

  return (
    <div className={cn("flex items-start gap-3 min-w-0", className)}>
      {showStackedAvatars && accepted.length > 0 ? (
        <div className="relative flex shrink-0 group">
          {avatars.slice(0, maxVisible).map((u, i) => (
            <Link
              key={u.id}
              href={`/u/${u.username}`}
              className={cn(
                "relative rounded-full ring-2 ring-background",
                stackSize,
                i > 0 && "-ml-2"
              )}
              style={{ zIndex: maxVisible - i }}
              title={userDisplayName(u)}
            >
              <Avatar className={cn(stackSize, "border border-border/40")}>
                <AvatarImage src={u.image ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {userDisplayName(u)[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
          ))}
          {overflow > 0 && (
            <span
              className={cn(
                "relative -ml-2 flex items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background",
                stackSize
              )}
            >
              +{overflow}
            </span>
          )}
          <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden min-w-[180px] rounded-xl border border-border bg-popover p-2 shadow-lg group-hover:block">
            <ul className="space-y-1">
              {avatars.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/u/${u.username}`}
                    className="pointer-events-auto flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback className="text-[9px]">
                        {userDisplayName(u)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{userDisplayName(u)}</span>
                    <span className="text-xs text-muted-foreground">
                      @{u.username}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <Link href={`/u/${author.username}`} className="shrink-0">
          <Avatar className={avatarSize}>
            <AvatarImage src={author.image ?? undefined} />
            <AvatarFallback>
              {userDisplayName(author)[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 flex-wrap text-sm">
          <Link href={`/u/${author.username}`} className="hover:underline">
            <DisplayNameWithSupportTier
              name={userDisplayName(author)}
              tier={author.supportTierSent ?? "PEBBLE"}
              nameClassName="font-bold"
              compact
            />
          </Link>
          {accepted.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1 min-w-0">
              <span className="text-muted-foreground">·</span>
              <Link
                href={`/u/${u.username}`}
                className="text-muted-foreground hover:text-foreground hover:underline truncate max-w-[120px]"
              >
                {userDisplayName(u)}
              </Link>
            </span>
          ))}
          {trailing}
        </div>
      </div>
    </div>
  );
}
