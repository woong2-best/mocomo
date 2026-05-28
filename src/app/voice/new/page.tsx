"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LiveBroadcastMode, LiveStreamCategory } from "@prisma/client";
import { createLiveStream } from "@/actions/live-stream";
import { LIVE_CATEGORIES } from "@/lib/live-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio, ChevronLeft, KeyRound, Copy, Check, Calendar, Monitor, Laptop } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESETS = [
  "🎙 애니덕질 라이브",
  "코스프레 촬영 Behind",
  "애니 같이 보기",
  "버튜버 잡담",
];

const LIVE_PW_KEY = (id: string) => `mocomo_live_pw_${id}`;

const BROADCAST_CATEGORIES = LIVE_CATEGORIES.filter((c) => c.value !== "ALL");

export default function NewVoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [name, setName] = useState(PRESETS[0]);
  const [category, setCategory] = useState<LiveStreamCategory>("JUST_CHATTING");
  const [broadcastMode, setBroadcastMode] = useState<LiveBroadcastMode>("BROWSER");
  const [created, setCreated] = useState<{
    channelId: string;
    password?: string;
    scheduled?: boolean;
    broadcastMode: LiveBroadcastMode;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError("");
    setLoading(true);
    try {
      const form = new FormData(e.currentTarget);
      const scheduledRaw = (form.get("scheduledAt") as string)?.trim();
      const result = await createLiveStream({
        name: (form.get("name") as string) || name,
        maxUsers: parseInt(form.get("maxUsers") as string, 10) || 200,
        allowScreen: true,
        allowCamera: true,
        category,
        tags: (form.get("tags") as string) || "",
        thumbnailUrl: (form.get("thumbnailUrl") as string) || undefined,
        description: (form.get("description") as string) || undefined,
        scheduledAt: scheduledRaw || undefined,
        donationGoalKrw: parseInt(form.get("donationGoalKrw") as string, 10) || undefined,
        broadcastMode,
      });

      if (result.error) {
        setSubmitError(result.error);
        return;
      }

      if (!result.channel) {
        setSubmitError("방송 방을 만들지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      if (result.scheduled) {
        setCreated({ channelId: result.channel.id, scheduled: true, broadcastMode });
        return;
      }

      if (!result.joinPassword) {
        setSubmitError("합방 비밀번호를 만들지 못했습니다. 예약 시간이 미래인지 확인해 주세요.");
        return;
      }

      sessionStorage.setItem(LIVE_PW_KEY(result.channel.id), result.joinPassword);
      setCreated({
        channelId: result.channel.id,
        password: result.joinPassword,
        broadcastMode,
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "방송 시작에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function copyPassword() {
    if (!created?.password) return;
    void navigator.clipboard.writeText(created.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function goToStudio() {
    if (!created) return;
    router.push(`/voice/${created.channelId}`);
  }

  if (created?.scheduled) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-6 text-center space-y-4">
          <Calendar className="h-10 w-10 mx-auto text-sky-600" />
          <h2 className="text-xl font-bold">방송 예약 완료</h2>
          <p className="text-sm text-muted-foreground">
            예약 시간에 스튜디오에서 방송을 시작할 수 있습니다.
          </p>
          <Button className="rounded-xl" variant="outline" asChild>
            <Link href="/live">라이브 홈</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (created?.password) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6 pb-24">
        <div className="rounded-2xl border border-green-500/30 bg-green-500/10 p-6 text-center space-y-4">
          <KeyRound className="h-10 w-10 mx-auto text-green-600" />
          <h2 className="text-xl font-bold">방송 시작됨</h2>
          <p className="text-sm text-muted-foreground">
            아래 <strong>합방 비밀번호</strong>를 시청자에게 공유하세요.
          </p>
          <p className="text-3xl font-mono font-bold tracking-[0.35em] text-foreground">{created.password}</p>
          {created.broadcastMode === "OBS" && (
            <p className="text-xs text-violet-700 bg-violet-500/10 rounded-lg px-3 py-2">
              OBS 모드입니다. 스튜디오 입장 후 <strong>OBS</strong> 탭에서 서버·스트림 키를 받으세요.
            </p>
          )}
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="outline" className="rounded-xl gap-2" onClick={copyPassword}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "복사됨" : "비밀번호 복사"}
            </Button>
            <Button className="rounded-xl gap-2" onClick={goToStudio}>
              <Radio className="h-4 w-4" />
              스튜디오 입장
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-4 space-y-4 pb-24 lg:pb-4">
      <Link href="/live">
        <Button variant="ghost" size="sm" className="gap-1">
          <ChevronLeft className="h-4 w-4" />
          라이브
        </Button>
      </Link>

      <div className="live-hero !p-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-600 text-white">
            <Radio className="h-5 w-5" />
          </span>
          라이브 방송 시작
        </h1>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">방송 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-xl px-3 py-2">
                {submitError}
              </p>
            )}
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
            <Input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="방송 제목"
              required
            />
            <div className="flex gap-2 p-1 rounded-xl bg-muted/40 border">
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg font-medium",
                  broadcastMode === "BROWSER" ? "bg-background shadow" : "text-muted-foreground"
                )}
                onClick={() => setBroadcastMode("BROWSER")}
              >
                <Laptop className="h-3.5 w-3.5" />
                브라우저
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg font-medium",
                  broadcastMode === "OBS" ? "bg-background shadow" : "text-muted-foreground"
                )}
                onClick={() => setBroadcastMode("OBS")}
              >
                <Monitor className="h-3.5 w-3.5" />
                OBS
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {BROADCAST_CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value as LiveStreamCategory)}
                  className={`text-xs px-2.5 py-1 rounded-full border ${
                    category === value ? "bg-red-600 text-white border-red-600" : "border-border"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Input name="tags" placeholder="태그 (선택)" />
            <Input name="thumbnailUrl" placeholder="썸네일 URL (선택)" />
            <Input name="description" placeholder="방송 설명 (선택)" />
            <Input name="donationGoalKrw" type="number" placeholder="후원 목표 원 (선택)" min={1000} step={1000} />
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">예약 방송 (선택)</summary>
              <Input name="scheduledAt" type="datetime-local" className="mt-2" />
              <p className="mt-1">비우면 즉시 라이브 시작 + 합방 비밀번호 발급</p>
            </details>
            <Input name="maxUsers" type="number" placeholder="최대 시청자" defaultValue={200} />
            <Button type="submit" className="w-full rounded-xl gap-2" disabled={loading}>
              <Radio className="h-4 w-4" />
              {loading ? "방송 준비 중…" : "방송 시작"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
