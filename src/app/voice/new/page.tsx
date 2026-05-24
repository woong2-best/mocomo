"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createVoiceChannel } from "@/actions/voice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, Video, Mic, ChevronLeft } from "lucide-react";

const PRESETS = [
  "🎙 덕질 라이브",
  "코스프레 촬영 Behind",
  "애니 같이 보기",
  "버튜버 잡담",
];

export default function NewVoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(PRESETS[0]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const result = await createVoiceChannel({
      name: (form.get("name") as string) || name,
      maxUsers: parseInt(form.get("maxUsers") as string) || 200,
      allowScreen: true,
      allowCamera: true,
    });
    setLoading(false);
    if (result.channel) router.push(`/voice/${result.channel.id}`);
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24 lg:pb-4">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          라이브
        </Button>
      </Link>

      <div className="rounded-2xl bg-gradient-to-r from-red-500/15 to-pink-500/15 border border-border/60 p-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Radio className="h-6 w-6 text-red-500" />
          라이브 방송 시작
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          카메라·화면 공유·음성 + 실시간 채팅. LiveKit 키가 설정되어 있으면 영상이 연결됩니다.
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">방 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setName(p)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    name === p ? "bg-primary text-primary-foreground border-primary" : "border-border"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="방 이름" required />
            <Input name="maxUsers" type="number" placeholder="최대 시청자" defaultValue={200} />
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" /> 화면/카메라
              </span>
              <span className="flex items-center gap-1">
                <Mic className="h-3.5 w-3.5" /> 음성
              </span>
            </div>
            <Button type="submit" className="w-full rounded-xl btn-rainbow gap-2" disabled={loading}>
              <Radio className="h-4 w-4" />
              {loading ? "생성 중..." : "방송 시작"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
