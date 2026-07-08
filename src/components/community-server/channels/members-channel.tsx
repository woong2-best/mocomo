import Link from "next/link";
import { Crown } from "lucide-react";
import { getCommunityMembersForSidebar } from "@/lib/community-server/server-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export async function MembersChannelView({ communityId }: { communityId: string }) {
  const members = await getCommunityMembersForSidebar(communityId);

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="shrink-0 px-4 py-3 border-b border-border/50">
        <h1 className="font-semibold">멤버 — {members.length}명</h1>
      </header>
      <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-border">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
            <Link href={`/u/${m.username}`} className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.image ?? undefined} />
                <AvatarFallback>{m.username[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{m.nickname ?? m.username}</p>
                <p className="text-xs text-muted-foreground">
                  {m.roles[0]?.name ?? (m.isOwner ? "Owner" : "Member")}
                </p>
              </div>
            </Link>
            {m.isOwner && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
          </li>
        ))}
      </ul>
    </div>
  );
}
