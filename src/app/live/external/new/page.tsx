import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getVerifiedStreamingAccountsForLive } from "@/actions/live-external";
import { ExternalLiveNewForm } from "@/components/live/external-live-new-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getServerTranslator } from "@/lib/i18n/server";

export default async function ExternalLiveNewPage() {
  const { t } = await getServerTranslator();
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/live/external/new");
  }

  const { accounts } = await getVerifiedStreamingAccountsForLive();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <NativePageTitle>{t("live.startBroadcast")}</NativePageTitle>
      <div className="mb-3">
        <Link
          href="/live"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("live.navBack")}
        </Link>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("live.external.noAccountsTitle")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("live.external.noAccountsDesc")}</p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/streaming-accounts">{t("live.external.connectCta")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ExternalLiveNewForm accounts={accounts} />
      )}
    </AppPageChrome>
  );
}
