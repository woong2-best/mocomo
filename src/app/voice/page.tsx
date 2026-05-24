import Link from "next/link";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic, Users } from "lucide-react";

export default async function VoicePage() {
  type ChannelWithCount = Awaited<
    ReturnType<
      typeof db.voiceChannel.findMany<{
        include: { _count: { select: { members: true } } };
      }>
    >
  >;
  let channels: ChannelWithCount = [];
  try {
    channels = await db.voiceChannel.findMany({
      where: { isLive: true },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    channels = [];
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mic className="h-6 w-6 text-neon-purple" />
          음성 채널
        </h1>
        <Link href="/voice/new">
          <Button size="sm">
            방 만들기
          </Button>
        </Link>
      </div>

      <p className="text-sm text-muted-foreground">
        Discord 스타일 음성방 · WebRTC/Livekit 연동 준비됨
      </p>

      <div className="grid gap-4">
        {channels.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              활성 음성방이 없습니다.
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
    </div>
  );
}
