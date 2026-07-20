"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DisplayNameWithSupportTier } from "@/components/user/display-name-with-support-tier";
import { userDisplayName } from "@/lib/user-public-select";
import type { SupportTierLevel } from "@prisma/client";
import { useLocale } from "@/components/providers/locale-provider";
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
  status?: string;
  user: CollabHeaderUser;
};

type Props = {
  author: CollabHeaderUser;
  collaborators?: CollabHeaderEntry[] | null;
  /** Optional trailing meta (time, etc.) */
  trailing?: React.ReactNode;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Instagram-style collab header: stacked avatars + "A님과 B님".
 * Site theme (light/dark) via existing tokens — not IG black chrome.
 */
export function PostCollaboratorsHeader({
  author,
  collaborators,
  trailing,
  size = "sm",
  className,
}: Props) {
  const { t } = useLocale();
  const others = (collaborators ?? [])
    .map((c) => c.user)
    .filter((u): u is CollabHeaderUser => !!u?.id && u.id !== author.id);

  const hasCollab = others.length > 0;
  const stackSize = size === "md" ? "h-10 w-10" : "h-10 w-10";
  const stackOverlap = size === "md" ? "h-9 w-9" : "h-8 w-8";
  const maxStack = 3;
  const stackUsers = hasCollab
    ? [author, ...others].slice(0, maxStack)
    : [author];
  const firstOther = others[0];
  const extraCount = Math.max(0, others.length - 1);

  return (
    <div className={cn("flex items-start gap-2.5 min-w-0", className)}>
      <div className="relative flex shrink-0 group">
        {stackUsers.map((u, i) => (
          <Link
            key={u.id}
            href={`/u/${u.username}`}
            className={cn(
              "relative rounded-full ring-2 ring-background",
              hasCollab ? stackOverlap : stackSize,
              i > 0 && "-ml-2.5"
            )}
            style={{ zIndex: stackUsers.length - i }}
            title={userDisplayName(u)}
          >
            <Avatar
              className={cn(
                hasCollab ? stackOverlap : stackSize,
                "border border-border/50"
              )}
            >
              <AvatarImage src={u.image ?? undefined} alt="" />
              <AvatarFallback className="text-[11px] font-semibold">
                {userDisplayName(u)[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        ))}

        {hasCollab && (
          <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden min-w-[200px] rounded-xl border border-border bg-card p-2 shadow-xl group-hover:block">
            <ul className="space-y-1">
              {[author, ...others].map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/u/${u.username}`}
                    className="pointer-events-auto flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={u.image ?? undefined} alt="" />
                      <AvatarFallback className="text-[9px]">
                        {userDisplayName(u)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate font-medium">
                      {userDisplayName(u)}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      @{u.username}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        {hasCollab && firstOther ? (
          <div className="min-w-0 leading-snug">
            <p className="text-[15px] font-semibold truncate">
              <Link
                href={`/u/${author.username}`}
                className="hover:underline"
              >
                {t("collab.headerAuthorWith", {
                  name: userDisplayName(author),
                })}
              </Link>
            </p>
            <p className="text-[15px] font-semibold truncate">
              <Link
                href={`/u/${firstOther.username}`}
                className="hover:underline"
              >
                {extraCount > 0
                  ? t("collab.headerOthersMore", {
                      name: userDisplayName(firstOther),
                      count: String(extraCount),
                    })
                  : t("collab.headerOther", {
                      name: userDisplayName(firstOther),
                    })}
              </Link>
            </p>
            {trailing ? (
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
                {trailing}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-wrap text-sm min-w-0">
            <Link href={`/u/${author.username}`} className="hover:underline min-w-0">
              <DisplayNameWithSupportTier
                name={userDisplayName(author)}
                tier={author.supportTierSent ?? "PEBBLE"}
                nameClassName="font-bold"
                compact
              />
            </Link>
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}
