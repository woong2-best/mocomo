import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Landmark } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedBankVerifyForm } from "@/components/used/used-bank-verify-form";
import { isBankVerified } from "@/lib/bank-verification";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function SettingsBankPage() {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/settings/bank");

  const { locale } = await getServerTranslator();
  const verified = isBankVerified(user);
  const emailOk = !!user.emailVerified;

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        {locale === "en" ? "Settings" : "설정"}
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          {locale === "en" ? "Bank account" : "국내 계좌 인증"}
        </h1>
      </NativePageTitle>

      {verified ? (
        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="pt-6 text-sm space-y-2">
            <p className="font-medium text-foreground">
              {locale === "en" ? "Verified account" : "인증 완료"}
            </p>
            <p className="text-muted-foreground">
              {locale === "en"
                ? "Your bank account is verified. It cannot be changed after verification."
                : "계좌 인증이 완료되었습니다. 인증 후 계좌 변경은 불가합니다."}
            </p>
          </CardContent>
        </Card>
      ) : !emailOk ? (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6 text-sm space-y-3">
            <p className="font-medium">
              {locale === "en" ? "Email verification required" : "이메일 인증이 필요합니다"}
            </p>
            <p className="text-muted-foreground">
              {locale === "en"
                ? "Verify your email before registering a bank account."
                : "계좌 인증 전에 이메일 인증을 완료해 주세요."}
            </p>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="rounded-xl">
                {locale === "en" ? "Account settings" : "계정 설정"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <UsedBankVerifyForm
          mode="account"
          callbackUrl="/settings/bank"
          legalName={user.name}
          emailVerified={emailOk}
        />
      )}
    </AppPageChrome>
  );
}
