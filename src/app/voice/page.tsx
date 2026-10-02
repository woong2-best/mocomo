import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
            <Button size="sm">Create room</Button>
          </Link>
        </div>
      </div>

      <PageSection
        title={t("app.voice.suydo2h")}
        icon={Mic}
        description={t("app.voice.livekit_webrtc")}
      >
        {channels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
              <p>{t("app.voice.sgshllq")}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild size="sm">
                  <Link href="/voice/new">{t("app.voice.sdfvh9h")}</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/live">Watch live</Link>
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
