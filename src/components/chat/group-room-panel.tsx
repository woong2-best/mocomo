"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createGroupPoll,
  joinSocialGroupVoiceCall,
  setGroupRoomAnnouncement,
  startSocialGroupVoiceCall,
  voteGroupPoll,
} from "@/actions/group-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Megaphone, Phone, Vote } from "lucide-react";

type PollView = {
  id: string;
  question: string;
  options: { id: string; label: string; count: number }[];
  myVote: string | null;
};

export function GroupRoomPanel({
  roomId,
  roomType,
  isOwner,
  announcementTitle,
  announcementBody,
  voiceLive,
  voiceChannelId,
  polls,
  joinCode,
}: {
  roomId: string;
  roomType: string;
  isOwner: boolean;
  announcementTitle: string | null;
  announcementBody: string | null;
  voiceLive: boolean;
  voiceChannelId: string | null;
  polls: PollView[];
  joinCode: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [annTitle, setAnnTitle] = useState("");
  const [annBody, setAnnBody] = useState("");
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);

  const isCosplayer = roomType === "COSPLAYER_GROUP";
  const isSocial = roomType === "SOCIAL_GROUP";

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function saveAnnouncement() {
    setError("");
    const res = await setGroupRoomAnnouncement(roomId, annTitle, annBody);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setAnnTitle("");
    setAnnBody("");
    refresh();
  }

  async function submitPoll() {
    setError("");
    const res = await createGroupPoll(roomId, pollQ, pollOpts);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    setPollQ("");
    setPollOpts(["", ""]);
    refresh();
  }

  async function handleVote(pollId: string, optionId: string) {
    setError("");
    const res = await voteGroupPoll(pollId, optionId);
    if ("error" in res && res.error) setError(res.error);
    else refresh();
  }

  async function handleVoice() {
    setError("");
    const res = voiceLive
      ? await joinSocialGroupVoiceCall(roomId)
      : await startSocialGroupVoiceCall(roomId);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("channelId" in res && res.channelId) {
      router.push(`/voice/${res.channelId}?from=${encodeURIComponent(`/messages/${roomId}`)}`);
    }
  }

  return (
    <div className="shrink-0 border-b border-border/60 bg-muted/20 px-3 py-2 space-y-2 max-h-[45vh] overflow-y-auto">
      {joinCode && isOwner ? (
        <p className="text-xs text-center bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5">
          입장 코드: <strong className="tracking-widest">{joinCode}</strong> — 참가자에게 직접 공유하세요
        </p>
      ) : null}

      {announcementTitle && announcementBody ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <p className="font-semibold flex items-center gap-1 text-primary">
            <Megaphone className="h-3.5 w-3.5" />
            {announcementTitle}
          </p>
          <p className="text-xs mt-1 whitespace-pre-wrap text-foreground/90">{announcementBody}</p>
        </div>
      ) : null}

      {polls.map((p) => (
        <div key={p.id} className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm">
          <p className="font-medium flex items-center gap-1">
            <Vote className="h-3.5 w-3.5 text-muted-foreground" />
            {p.question}
          </p>
          <div className="mt-2 space-y-1">
            {p.options.map((o) => (
              <button
                key={o.id}
                type="button"
                disabled={pending}
                onClick={() => void handleVote(p.id, o.id)}
                className={`w-full text-left text-xs rounded-lg px-2 py-1.5 border transition-colors ${
                  p.myVote === o.id
                    ? "border-primary bg-primary/10 font-medium"
                    : "border-border/60 hover:bg-muted/50"
                }`}
              >
                {o.label}
                <span className="text-muted-foreground ml-1">({o.count})</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      {isCosplayer && isOwner ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-medium text-muted-foreground">공지 · 투표 만들기</summary>
          <div className="mt-2 space-y-2">
            <Input
              placeholder="공지 제목"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              className="h-8 rounded-lg text-xs"
            />
            <textarea
              placeholder="공지 내용"
              value={annBody}
              onChange={(e) => setAnnBody(e.target.value)}
              className="w-full min-h-[60px] rounded-lg border border-input bg-background px-2 py-1 text-xs"
            />
            <Button
              type="button"
              size="sm"
              className="w-full rounded-lg h-8"
              disabled={pending}
              onClick={() => void saveAnnouncement()}
            >
              공지 등록
            </Button>
            <Input
              placeholder="투표 질문"
              value={pollQ}
              onChange={(e) => setPollQ(e.target.value)}
              className="h-8 rounded-lg text-xs"
            />
            {pollOpts.map((v, i) => (
              <Input
                key={i}
                placeholder={`선택지 ${i + 1}`}
                value={v}
                onChange={(e) => {
                  const next = [...pollOpts];
                  next[i] = e.target.value;
                  setPollOpts(next);
                }}
                className="h-8 rounded-lg text-xs"
              />
            ))}
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 rounded-lg h-8"
                onClick={() => setPollOpts((o) => (o.length < 6 ? [...o, ""] : o))}
              >
                선택지 +
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1 rounded-lg h-8"
                disabled={pending}
                onClick={() => void submitPoll()}
              >
                투표 만들기
              </Button>
            </div>
          </div>
        </details>
      ) : null}

      {isSocial ? (
        <Button
          type="button"
          variant={voiceLive ? "default" : "outline"}
          size="sm"
          className="w-full rounded-xl h-9 gap-2"
          disabled={pending}
          onClick={() => void handleVoice()}
        >
          <Phone className="h-4 w-4" />
          {voiceLive ? "단체 통화 참여" : "단체 통화 시작"}
        </Button>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {isSocial && !voiceLive && voiceChannelId ? (
        <p className="text-[10px] text-muted-foreground text-center">
          <Link href={`/voice/${voiceChannelId}`} className="underline">
            통화방 바로가기
          </Link>
        </p>
      ) : null}
    </div>
  );
}
