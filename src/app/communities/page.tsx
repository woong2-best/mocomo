import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";

const categoryLabels: Record<string, string> = {
  ANIME: "애니",
  MANGA: "만화",
  GAME: "게임",
  VTUBER: "버튜버",
  COSPLAY: "코스프레",
  FIGURE: "피규어",
  ART: "그림",
  MUSIC: "음악",
  AI_ART: "AI 그림",
  LIGHT_NOVEL: "라노벨",
  GOODS: "굿즈",
  NSFW: "NSFW",
  OTHER: "기타",
};

export default async function CommunitiesPage() {
  let communities: Awaited<ReturnType<typeof db.community.findMany>> = [];
  try {
    communities = await db.community.findMany({
      orderBy: { memberCount: "desc" },
      take: 50,
      include: { children: { take: 5 } },
    });
  } catch {
    communities = [];
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">커뮤니티</h1>
        <Link href="/communities/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            커뮤니티 만들기
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {communities.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="p-8 text-center text-muted-foreground">
              커뮤니티가 없습니다. 첫 커뮤니티를 만들어보세요!
            </CardContent>
          </Card>
        ) : (
          communities.map((c) => (
            <Link key={c.id} href={`/c/${c.slug}`}>
              <Card className="hover:border-primary/40 transition-all h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {categoryLabels[c.category] || c.category}
                    </span>
                    {c.isNsfw && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                        NSFW
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {c.memberCount} 멤버
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
