import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { listUserStreamingAccounts } from "@/lib/streaming-accounts/service";
import { StreamingAccountsManager } from "@/components/streaming-accounts/streaming-accounts-manager";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function StreamingAccountsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const session = await getCachedSession();
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/settings/streaming-accounts");
  }

  const sp = await searchParams;
  const accounts = await listUserStreamingAccounts(session.user.id);

  return (
    <AppPageChrome spacing="sm">
      <div className="mb-3">
        <Link
          href="/settings/streamer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          스트리머 설정
        </Link>
      </div>
      <h1 className="text-xl font-bold">연결된 스트리밍 계정</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        YouTube · Twitch · 치지직 · Kick 계정을 연결하고 소유권을 인증하세요. 인증된 계정으로만
        외부 라이브 후원을 받을 수 있습니다.
      </p>
      <StreamingAccountsManager
        initialAccounts={accounts}
        bannerError={sp.error ? decodeURIComponent(sp.error) : null}
        bannerConnected={sp.connected ?? null}
      />
    </AppPageChrome>
  );
}
