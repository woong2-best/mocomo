"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** 결제 완료 후 ?videoDonation=xxx 쿼리로 YouTube URL 입력 */
export function LiveVideoTipUrlPrompt({ channelId }: { channelId: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const donationId = searchParams.get("videoDonation");
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (donationId) setOpen(true);
  }, [donationId]);

  function clearQuery() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("videoDonation");
    const q = next.toString();
    router.replace(q ? `/voice/${channelId}?${q}` : `/voice/${channelId}`, { scroll: false });
  }

  async function submit() {
    if (!donationId) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/live/${channelId}/video-donations/${donationId}/url`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        setError(body.error ?? "등록에 실패했습니다.");
        return;
      }
      setDone(true);
      setTimeout(() => {
        setOpen(false);
        clearQuery();
      }, 1500);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  if (!donationId) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) clearQuery();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-red-500" />
            영상 링크 입력
          </DialogTitle>
          <DialogDescription>
            결제가 완료되었습니다. YouTube 영상 URL을 입력해 주세요. 호스트 검수 후 방송에 재생됩니다.
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <p className="text-sm text-emerald-600 font-medium">등록되었습니다. 검수를 기다려 주세요!</p>
        ) : (
          <>
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="rounded-xl"
              autoFocus
            />
            <Button className="w-full rounded-xl" disabled={loading || !url.trim()} onClick={() => void submit()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "대기열 등록"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
