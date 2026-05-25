"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendEmoticonToStreamer } from "@/actions/goods-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift } from "lucide-react";

export function SendEmoticonForm({
  itemId,
  packName,
  pricePaid,
}: {
  itemId: string;
  packName: string;
  pricePaid: number;
}) {
  const [username, setUsername] = useState("");
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    const res = await sendEmoticonToStreamer(itemId, username);
    setLoading(false);
    if ("error" in res && res.error) {
      setMsg(res.error);
      return;
    }
    setMsg(`전송 완료! 스트리머에게 ${Math.floor(pricePaid * 0.9).toLocaleString()}원이 적립됩니다.`);
    setUsername("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl border border-border/60 p-3 bg-muted/20">
      <p className="text-xs text-muted-foreground">
        「{packName}」 · 1회만 전송 가능 · 플랫폼 수수료 10%
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="스트리머 @닉네임"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-xl"
          disabled={loading}
        />
        <Button type="submit" size="sm" className="rounded-xl shrink-0 gap-1" disabled={loading || !username.trim()}>
          <Gift className="h-4 w-4" />
          보내기
        </Button>
      </div>
      {msg && <p className={`text-xs ${msg.includes("완료") ? "text-primary" : "text-destructive"}`}>{msg}</p>}
    </form>
  );
}
