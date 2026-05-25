import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { profile: true, otakuProfile: true, cosplayerProfile: { select: { id: true } } },
  });

  return (
    <div className="max-w-lg mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>닉네임: {user?.username}</p>
          <p>이메일: {user?.email}</p>
          <p>레벨: Lv.{user?.level} (XP {user?.xp})</p>
          <p>프리미엄: {user?.premiumTier}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>프로필</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{user?.profile?.bio || "소개 없음"}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings/profile">
              <Button variant="outline" size="sm">
                프로필 수정
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="ghost" size="sm">
                후원 등급
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>코스어</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.cosplayerProfile ? (
            <>
              <p className="text-sm text-muted-foreground">코스어로 등록되어 있습니다.</p>
              <Link href={`/cosplay/${user.username}`}>
                <Button variant="outline" size="sm">
                  코스어 페이지
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">사진 1장 · 소개 300자 · 애니 연동</p>
              <Link href="/cosplay/apply">
                <Button size="sm" className="rounded-xl">
                  코스어 신청
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>덕질 프로필</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            좋아하는 캐릭터: {user?.otakuProfile?.favoriteChars?.join(", ") || "없음"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>보안</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>2차 인증: {user?.twoFactorEnabled ? "활성" : "비활성"}</p>
          <p>NSFW 표시: {user?.showNsfw ? "켜짐" : "꺼짐"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>약관 및 정책</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link href="/legal/terms" className="block text-primary hover:underline">
            이용약관
          </Link>
          <Link href="/legal/privacy" className="block text-primary hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/legal/policy" className="block text-primary hover:underline">
            운영원칙 및 이용정책
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
