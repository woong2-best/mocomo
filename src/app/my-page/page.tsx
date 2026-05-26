import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      posts: { take: 5, orderBy: { createdAt: "desc" } },
      tipsSent: { take: 5, orderBy: { createdAt: "desc" }, include: { receiver: { select: { username: true } } } },
      creatorSupportsGiven: {
        take: 10,
        orderBy: { updatedAt: "desc" },
        include: { creator: { select: { username: true } } },
      },
    },
  });

  if (!user) redirect("/auth/signin");

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Page</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">활동 요약</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>닉네임: @{user.username}</p>
          <p>레벨: Lv.{user.level}</p>
          <Link href={`/u/${user.username}`} className="text-primary text-sm">프로필 보기 →</Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {user.posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">게시물 없음</p>
          ) : (
            user.posts.map((p) => (
              <Link key={p.id} href={`/post/${p.id}`} className="block text-sm hover:text-primary truncate">
                {p.title || p.content.slice(0, 50)}
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">후원 기록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {user.tipsSent.map((t) => (
            <p key={t.id}>
              @{t.receiver.username} — {t.amount.toLocaleString()}원
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
