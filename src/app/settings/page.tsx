import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LocaleSettingsForm } from "@/components/settings/locale-settings-form";
import { PostsLockSettingsForm } from "@/components/settings/posts-lock-settings-form";
import { FollowRequestsPanel } from "@/components/settings/follow-requests-panel";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { AccountDeletionForm } from "@/components/settings/account-deletion-form";
import { SettingsPageChrome } from "@/components/settings/settings-page-chrome";
import { getServerTranslator } from "@/lib/i18n/server";
import { CountryFlag } from "@/components/user/country-flag";
import { getIncomingFollowRequests } from "@/actions/social";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [user, { t }, followRequests] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        email: true,
        passwordHash: true,
        premiumTier: true,
        locale: true,
        countryCode: true,
        timeZone: true,
        postsLocked: true,
        twoFactorEnabled: true,
        showNsfw: true,
        profile: true,
        otakuProfile: true,
        cosplayerProfile: { select: { id: true } },
      },
    }),
    getServerTranslator(),
    getIncomingFollowRequests().catch(() => []),
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
            initialTimeZone={user?.timeZone ?? "UTC"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.postsLockTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <PostsLockSettingsForm initialLocked={user?.postsLocked ?? false} />
          {(user?.postsLocked || followRequests.length > 0) && (
            <div className="border-t border-border/60 pt-4">
              <h3 className="text-sm font-semibold mb-2">{t("settings.followRequestsTitle")}</h3>
              <FollowRequestsPanel initialRequests={followRequests} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.account")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex items-center gap-1 flex-wrap">
            <span>
              {t("settings.nickname")}: {user?.username}
            </span>
            {user?.countryCode ? <CountryFlag code={user.countryCode} size={16} className="ml-0.5" /> : null}
          </p>
          <p>
            {t("settings.email")}: {user?.email}
          </p>
          <p>
            {t("settings.premium")}: {user?.premiumTier}
          </p>
          <SignOutButton className="w-full rounded-xl mt-2" />
          <AccountDeletionForm username={user?.username ?? ""} hasPassword={Boolean(user?.passwordHash)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{user?.profile?.bio || t("settings.noBio")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/settings/profile">
              <Button variant="outline" size="sm">
                {t("settings.editProfile")}
              </Button>
            </Link>
            <Link href="/settings/creator">
              <Button variant="outline" size="sm">
                {t("settings.creatorRevenue")}
              </Button>
            </Link>
            <Link href="/coupons">
              <Button variant="outline" size="sm">
                내 쿠폰
              </Button>
            </Link>
            <Link href="/support">
              <Button variant="ghost" size="sm">
                {t("settings.supportTier")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border-folk-terracotta/25 bg-folk-terracotta/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("settings.discoverTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("settings.discoverDesc")}</p>
          <div className="flex flex-wrap gap-2">
            <Link href="/discover">
              <Button size="sm" className="rounded-xl bg-folk-terracotta text-white hover:bg-folk-terracotta/90">
                {t("settings.discoverStart")}
              </Button>
            </Link>
            <Link href="/discover/settings">
              <Button variant="outline" size="sm">
                {t("settings.discoverSettings")}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.cosplayTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {user?.cosplayerProfile ? (
            <>
              <p className="text-sm text-muted-foreground">{t("settings.cosplayRegistered")}</p>
              <Link href={`/cosplay/${user.username}`}>
                <Button variant="outline" size="sm">
                  {t("settings.cosplayProfile")}
                </Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("settings.cosplayApplyDesc")}</p>
              <Link href="/cosplay/apply">
                <Button size="sm" className="rounded-xl">
                  {t("settings.cosplayApply")}
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.otakuTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("settings.favoriteChars", {
              chars: user?.otakuProfile?.favoriteChars?.join(", ") || t("settings.none"),
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.security")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            {t("settings.twoFactor")}:{" "}
            {user?.twoFactorEnabled ? t("settings.twoFactorOn") : t("settings.twoFactorOff")}
          </p>
          <p>
            {t("settings.nsfw")}: {user?.showNsfw ? t("settings.nsfwOn") : t("settings.nsfwOff")}
          </p>
          <Link href="/settings/bank">
            <Button variant="outline" size="sm" className="rounded-xl">
              국내 계좌 인증
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.legalTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Link href="/legal/terms" className="block text-primary hover:underline">
            {t("settings.legalTerms")}
          </Link>
          <Link href="/legal/creator-terms" className="block text-primary hover:underline">
            {t("settings.legalCreator")}
          </Link>
          <Link href="/legal/payment" className="block text-primary hover:underline">
            {t("settings.legalPayment")}
          </Link>
          <Link href="/legal/copyright" className="block text-primary hover:underline">
            {t("settings.legalCopyright")}
          </Link>
          <Link href="/legal/privacy" className="block text-primary hover:underline">
            {t("settings.legalPrivacy")}
          </Link>
          <Link href="/legal/account-deletion" className="block text-primary hover:underline">
            {t("settings.legalDeletion")}
          </Link>
          <Link href="/legal/policy" className="block text-primary hover:underline">
            {t("settings.legalPolicy")}
          </Link>
        </CardContent>
      </Card>
    </SettingsPageChrome>
  );
}
