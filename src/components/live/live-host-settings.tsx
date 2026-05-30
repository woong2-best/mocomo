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
import { updateLiveStreamSettings } from "@/actions/live-stream";
import { ensureStringArray } from "@/lib/ensure-array";

function HostSettingsForm({
  channelId,
  initialSlow,
  initialBanned,
}: {
  channelId: string;
  initialSlow: number;
  initialBanned: string[];
}) {
  const safeBanned = ensureStringArray(initialBanned);
  const [slow, setSlow] = useState(String(initialSlow));
  const [words, setWords] = useState(safeBanned.join(", "));
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

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="text-xs text-muted-foreground">슬로우 모드 (초, 0=끔)</label>
        <Input
          value={slow}
          onChange={(e) => setSlow(e.target.value)}
          type="number"
          min={0}
          max={120}
          className="rounded-xl mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">추가 금칙어 (쉼표 구분)</label>
        <Input
          value={words}
          onChange={(e) => setWords(e.target.value)}
          className="rounded-xl mt-1"
          placeholder="예: 광고, 홍보"
        />
      </div>
      <Button className="w-full rounded-xl" onClick={save} disabled={pending}>
        채팅 설정 저장
      </Button>
      {msg && <p className="text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

export function LiveHostSettings({
  channelId,
  slowModeSeconds: initialSlow,
  bannedWords: initialBanned,
  embedded,
}: {
  channelId: string;
  slowModeSeconds: number;
  bannedWords: string[];
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <HostSettingsForm
        channelId={channelId}
        initialSlow={initialSlow}
        initialBanned={initialBanned}
      />
    );
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
        <HostSettingsForm
          channelId={channelId}
          initialSlow={initialSlow}
          initialBanned={initialBanned}
        />
      </DialogContent>
    </Dialog>
  );
}
