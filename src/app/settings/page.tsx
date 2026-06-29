import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LocaleSettingsForm } from "@/components/settings/locale-settings-form";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [user, { t }] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        email: true,
        level: true,
        xp: true,
        premiumTier: true,
        locale: true,
        countryCode: true,
        twoFactorEnabled: true,
        showNsfw: true,
        profile: true,
        otakuProfile: true,
        cosplayerProfile: { select: { id: true } },
      },
    }),
    getServerTranslator(),
  ]);

  return (
    <SettingsPageChrome>
      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.localeTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <LocaleSettingsForm
            initialLocale={user?.locale ?? "ko"}
            initialCountryCode={user?.countryCode ?? "KR"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>계정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>닉네임: {user?.username}</p>
          <p>이메일: {user?.email}</p>
          <p>레벨: Lv.{user?.level} (XP {user?.xp})</p>
          <p>프리미엄: {user?.premiumTier}</p>
          <SignOutButton className="w-full rounded-xl mt-2" />
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
            <Link href="/settings/creator">
              <Button variant="outline" size="sm">
                크리에이터 수익
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

      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-950/10 to-fuchsia-950/5">
        <CardHeader>
          <CardTitle>친구 · 코스어 매칭</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            원할 때만 참여 · 거리·나이·취향 필터 · ㅊㅊ·좋아요·매칭
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/discover">
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600">
                매칭 시작
              </Button>
            </Link>
            <Link href="/discover/settings">
              <Button variant="outline" size="sm">
                매칭 설정
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>코스프레</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.cosplayerProfile ? (
            <>
              <p className="text-sm text-muted-foreground">코스프레 프로필이 등록되어 있습니다.</p>
              <Link href={`/cosplay/${user.username}`}>
                <Button variant="outline" size="sm">
                  코스프레 프로필
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">사진 1장 · 소개 300자 · 애니 연동</p>
              <Link href="/cosplay/apply">
                <Button size="sm" className="rounded-xl">
                  코스프레 등록
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>애니덕질 프로필</CardTitle>
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
          <Link href="/legal/creator-terms" className="block text-primary hover:underline">
            크리에이터 약관
          </Link>
          <Link href="/legal/payment" className="block text-primary hover:underline">
            결제 및 환불 정책
          </Link>
          <Link href="/legal/copyright" className="block text-primary hover:underline">
            저작권 정책
          </Link>
          <Link href="/legal/privacy" className="block text-primary hover:underline">
            개인정보처리방침
          </Link>
          <Link href="/legal/account-deletion" className="block text-primary hover:underline">
            계정 및 데이터 삭제
          </Link>
          <Link href="/legal/policy" className="block text-primary hover:underline">
            운영원칙 및 이용정책
          </Link>
        </CardContent>
      </Card>
    </SettingsPageChrome>
  );
}
