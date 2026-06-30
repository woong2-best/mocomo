import Link from "next/link";
import { Mic, Radio } from "lucide-react";
import { getCachedVoiceChannels } from "@/lib/cached-data";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { PageSection } from "@/components/layout/page-section";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VoiceChannelList } from "@/components/voice/voice-channel-list";

export const revalidate = 30;

export default async function VoicePage() {
  type ChannelWithCount = Awaited<ReturnType<typeof getCachedVoiceChannels>>;
  let channels: ChannelWithCount = [];

  try {
    channels = await getCachedVoiceChannels();
  } catch {
    channels = [];
  }

  return (
    <AppPageChrome maxWidth="3xl" spacing="sm">
      <div className="flex items-center justify-between gap-2">
        <NativePageTitle>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic className="h-6 w-6 text-neon-purple" />
            음성 · 라이브
          </h1>
        </NativePageTitle>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/live">
            <Button size="sm" variant="outline">
              <Radio className="mr-1 h-4 w-4" />
              라이브 홈
            </Button>
          </Link>
          <Link href="/voice/new">
            <Button size="sm">방 만들기</Button>
          </Link>
        </div>
      </div>

      <PageSection
        title="활성 음성방"
        icon={Mic}
        description="실시간 음성 방송 · LiveKit WebRTC"
      >
        {channels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <p>활성 음성방이 없습니다.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href="/voice/new">첫 방송 만들기</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/live">라이브 시청하기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <VoiceChannelList channels={channels} />
        )}
      </PageSection>
    </AppPageChrome>
  );
}
