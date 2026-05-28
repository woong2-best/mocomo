"use client";

import { useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateLiveStreamSettings, setLiveVodUrl } from "@/actions/live-stream";

export function LiveHostSettings({
  channelId,
  slowModeSeconds: initialSlow,
  bannedWords: initialBanned,
  showVod,
}: {
  channelId: string;
  slowModeSeconds: number;
  bannedWords: string[];
  showVod?: boolean;
}) {
  const [slow, setSlow] = useState(String(initialSlow));
  const [words, setWords] = useState(initialBanned.join(", "));
  const [vod, setVod] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg("");
    startTransition(async () => {
      const res = await updateLiveStreamSettings(channelId, {
        slowModeSeconds: parseInt(slow, 10) || 0,
        chatBannedWords: words
          .split(/[,，]/)
          .map((w) => w.trim())
          .filter(Boolean)
          .slice(0, 30),
      });
      if ("error" in res && res.error) setMsg(res.error);
      else setMsg("저장되었습니다.");
    });
  }

  function saveVod() {
    startTransition(async () => {
      const res = await setLiveVodUrl(channelId, vod);
      if ("error" in res && res.error) setMsg(res.error);
      else setMsg("다시보기 URL이 저장되었습니다.");
    });
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-xl gap-1">
          <Settings2 className="h-4 w-4" />
          방송 설정
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle>호스트 · 채팅 설정</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <div>
            <label className="text-xs text-muted-foreground">슬로우 모드 (초, 0=끔)</label>
            <Input value={slow} onChange={(e) => setSlow(e.target.value)} type="number" min={0} max={120} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">추가 금칙어 (쉼표 구분)</label>
            <Input value={words} onChange={(e) => setWords(e.target.value)} className="rounded-xl mt-1" placeholder="예: 광고, 홍보" />
          </div>
          {showVod && (
            <div>
              <label className="text-xs text-muted-foreground">다시보기 URL (MP4/HLS 링크)</label>
              <Input value={vod} onChange={(e) => setVod(e.target.value)} className="rounded-xl mt-1" placeholder="https://..." />
              <Button size="sm" variant="secondary" className="rounded-xl mt-2" onClick={saveVod} disabled={pending}>
                다시보기 저장
              </Button>
            </div>
          )}
          <Button className="w-full rounded-xl" onClick={save} disabled={pending}>
            채팅 설정 저장
          </Button>
          {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
