import Link from "next/link";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth";
import { getStreamerProfile } from "@/actions/streamer";
import { StreamerSettingsForm } from "@/components/live/streamer-settings-form";
import { AppPageChrome } from "@/components/layout/app-page-chrome";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export default async function StreamerSettingsPage() {
  if (!isLiveFeatureEnabled()) redirect("/settings");
  const session = await getCachedSession();
  if (!session?.user?.id) redirect("/auth/signin?callbackUrl=/settings/streamer");

  const profile = await getStreamerProfile().catch(() => null);

  return (
    <AppPageChrome spacing="sm">
      <h1 className="text-xl font-bold">스트리머 프로필</h1>
      <p className="text-sm text-muted-foreground">
        공지·방송 일정·소개 문구를 설정합니다. 파트너 배지는 운영진이 부여합니다.
      </p>
      <Link
        href="/settings/streaming-accounts"
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        스트리밍 계정 연결 →
      </Link>
      <Link
        href="/avatar/studio/broadcast"
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        버츄얼 아바타 스튜디오 →
      </Link>
      <StreamerSettingsForm
        initial={{
          bio: profile?.bio ?? "",
          announcement: profile?.announcement ?? "",
          scheduleNote: profile?.scheduleNote ?? "",
        }}
      />
    </AppPageChrome>
  );
}
