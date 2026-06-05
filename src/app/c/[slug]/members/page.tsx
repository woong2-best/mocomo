import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommunityBySlug, getCommunityMembers } from "@/actions/community-hub";
import { CommunitySubnav } from "@/components/communities/community-subnav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Crown } from "lucide-react";

export default async function CommunityMembersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCommunityBySlug(slug);
  if (!data) notFound();

  const { community } = data;
  const { members } = await getCommunityMembers(community.id, 100);

  return (
    <div className="max-w-2xl mx-auto p-4 pb-nav lg:pb-8 space-y-6">
      <Link
        href={`/c/${slug}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        {community.name}
      </Link>

      <h1 className="text-xl font-bold">멤버 ({community.memberCount}명)</h1>
      <CommunitySubnav slug={slug} />

      <ul className="divide-y rounded-xl border border-border overflow-hidden">
        {members.length === 0 ? (
          <li className="p-6 text-center text-sm text-muted-foreground">멤버가 없습니다.</li>
        ) : (
          members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-3 bg-card">
              {m.user ? (
                <Link href={`/u/${m.user.username}`} className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={m.user.image ?? undefined} />
                    <AvatarFallback>{m.user.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.role === "owner" ? "개설자" : "멤버"} ·{" "}
                      {new Date(m.joinedAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">알 수 없는 사용자</span>
              )}
              {m.role === "owner" && <Crown className="h-4 w-4 text-amber-500 shrink-0" />}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
