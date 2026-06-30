import Link from "next/link";
import { Mic, Radio, Users } from "lucide-react";
import { getCachedVoiceChannels } from "@/lib/cached-data";
import { AppPageChrome, NativePageTitle } from "@/components/layout/app-page-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <AppPageChrome maxWidth="3xl">
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

      <p className="text-sm text-muted-foreground">
        실시간 음성 방송 · LiveKit WebRTC · 시청은 라이브 홈에서도 할 수 있어요
      </p>

      <div className="grid gap-4">
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
          channels.map((ch) => (
            <Link key={ch.id} href={`/voice/${ch.id}`}>
              <Card className="hover:border-primary/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    {ch.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {ch._count.members} / {ch.maxUsers}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </AppPageChrome>
  );
}
