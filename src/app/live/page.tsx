import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Radio, Video, Mic, Users, Sparkles } from "lucide-react";
import { LivePageActions } from "@/components/live/live-page-actions";
import { getCachedLiveChannels } from "@/lib/cached-data";

export const revalidate = 30;

export default async function LivePage() {
  let channels: Awaited<ReturnType<typeof getCachedLiveChannels>>["channels"] = [];
  let upcoming: Awaited<ReturnType<typeof getCachedLiveChannels>>["upcoming"] = [];
  let hostMap: Record<string, { id: string; username: string; image: string | null }> = {};

  try {
    const data = await getCachedLiveChannels();
    channels = data.channels;
    upcoming = data.upcoming;
    hostMap = Object.fromEntries(data.hosts.map((h) => [h.id, h]));
  } catch {
    channels = [];
    upcoming = [];
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-8">
      <div className="rounded-2xl bg-gradient-to-br from-red-500/20 via-pink-500/10 to-violet-500/20 border border-border/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Radio className="h-7 w-7 text-red-500" />
              라이브 · 방송
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-lg">
              LiveKit 영상/음성 방송, 실시간 채팅, 코스어·버튜버·덕질 라운지. 방송 시작 후 팬들이 바로 입장할 수
              있어요.
            </p>
          </div>
          <LivePageActions variant="header" />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6 text-center text-xs">
          {[
            { icon: Video, label: "화면 공유" },
            { icon: Mic, label: "음성 채팅" },
            { icon: Users, label: "실시간 채팅" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-xl bg-background/60 py-3 px-2 border border-border/40">
              <Icon className="h-5 w-5 mx-auto mb-1 text-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          지금 라이브 ({channels.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.length === 0 ? (
            <Card className="col-span-full rounded-2xl">
              <CardContent className="p-10 text-center space-y-4">
                <Sparkles className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground">진행 중인 라이브가 없습니다. 첫 방송을 시작해 보세요!</p>
                <LivePageActions variant="empty" />
              </CardContent>
            </Card>
          ) : (
            channels.map((ch) => {
              const host = hostMap[ch.createdBy];
              return (
                <Link key={ch.id} href={`/voice/${ch.id}`}>
                  <Card className="overflow-hidden hover:border-red-500/50 rounded-2xl h-full transition-shadow hover:shadow-lg">
                    <div className="w-full aspect-video bg-gradient-to-br from-red-500/20 via-violet-500/15 to-pink-500/20 flex items-center justify-center">
                      {host?.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={host.image} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-red-500/50" />
                      ) : (
                        <Radio className="h-10 w-10 text-red-500/60" />
                      )}
                    </div>
                    <div className="h-1 bg-gradient-to-r from-red-500 to-pink-500" />
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">
                          LIVE
                        </span>
                        {ch.name}
                      </CardTitle>
                      {host && <p className="text-xs text-muted-foreground">@{host.username}</p>}
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      {ch.viewerCount}명 시청 중
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="font-semibold mb-4 text-muted-foreground">대기 중인 방</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {upcoming.map((ch) => (
              <Link key={ch.id} href={`/voice/${ch.id}`}>
                <Card className="rounded-xl hover:bg-muted/30">
                  <CardContent className="p-4">
                    <span className="font-medium">{ch.name}</span>
                    <span className="text-xs text-muted-foreground block mt-1">종료된 방송</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
