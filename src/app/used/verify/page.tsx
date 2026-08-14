import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCachedCurrentUser } from "@/lib/auth";
import { UsedBankVerifyForm } from "@/components/used/used-bank-verify-form";
import { isUsedMarketEligible } from "@/lib/used-bank-auth";
import { getServerTranslator } from "@/lib/i18n/server";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";

export default async function UsedVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const user = await getCachedCurrentUser();
  if (!user) redirect("/auth/signin?callbackUrl=/used/verify");

  const { callbackUrl } = await searchParams;
  const next = callbackUrl?.startsWith("/used") ? callbackUrl : "/used/new";
  const { locale } = await getServerTranslator();

  if (isUsedMarketEligible(user)) redirect(next);

  const emailOk = !!user.emailVerified;

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <Link
        href="/used"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-medium"
      >
        <ChevronLeft className="h-4 w-4" />
        {locale === "en" ? "Marketplace" : "중고거래 홈"}
      </Link>
      <NativePageTitle>
        <h1 className="text-xl font-bold">
          {locale === "en" ? "Bank account verification" : "계좌 1원 인증"}
        </h1>
      </NativePageTitle>
      <UsedBankVerifyForm callbackUrl={next} legalName={user.name} emailVerified={emailOk} />
    </AppPageChrome>
  );
}
