import Link from "next/link";
import type { SupportTierLevel } from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTierMoco, getTierInfo } from "@/lib/tiers";
import { userAvatarFallbackInitial } from "@/lib/user-public-select";
import type { SupportedUserAtTier } from "@/lib/creator-support";

export function SupportTierSupportedUsers({
  tier,
  users,
}: {
  tier: SupportTierLevel;
  users: SupportedUserAtTier[];
}) {
  const info = getTierInfo(tier);

  return (
    <section className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold" style={{ color: info.color }}>
          {info.label} — 이 등급으로 후원한 유저
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">{users.length}명</p>
      </div>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          이 등급으로 후원한 유저가 없습니다. 후원하지 않은 유저는 표시되지 않습니다.
        </p>
      ) : (
        <ul className="space-y-2">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                href={`/u/${user.username}`}
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-3 py-2 hover:border-primary/30 hover:bg-muted/40 transition-colors"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.image ?? undefined} alt={user.username} />
                  <AvatarFallback>{userAvatarFallbackInitial(user)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">@{user.username}</span>
                  {user.name ? (
                    <span className="block truncate text-xs text-muted-foreground">{user.name}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatTierMoco(user.totalAmount)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
