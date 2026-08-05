import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getVerifiedStreamingAccountsForLive } from "@/actions/live-external";
import { ExternalLiveNewForm } from "@/components/live/external-live-new-form";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { ChevronLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function ExternalLiveNewPage() {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/live/external/new");
  }

  const { accounts } = await getVerifiedStreamingAccountsForLive();

  return (
    <AppPageChrome maxWidth="lg" spacing="sm">
      <NativePageTitle>라이브 방송 시작</NativePageTitle>
      <div className="mb-3">
        <Link
          href="/live"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          라이브
        </Link>
      </div>

      {accounts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">스트리밍 계정 인증 필요</CardTitle>
            <p className="text-sm text-muted-foreground">
              보안상 URL을 직접 붙여넣을 수 없습니다. 먼저 본인 소유의 YouTube·Twitch·치지직
              계정을 연결하고 소유권을 인증해 주세요.
            </p>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/settings/streaming-accounts">스트리밍 계정 연결하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <ExternalLiveNewForm accounts={accounts} />
      )}
    </AppPageChrome>
  );
}
