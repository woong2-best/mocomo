"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getOrCreateDM } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Search, Users, Radio } from "lucide-react";

export default function NewMessagePage() {
  return (
    <Suspense fallback={<div className="flex-1 min-h-0 animate-pulse bg-muted/20" />}>
      <NewMessagePageInner />
    </Suspense>
  );
}

function NewMessagePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shareText = searchParams.get("share")?.trim() ?? "";
  const shareLabel = searchParams.get("label")?.trim() ?? "라이브";
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function startDm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const q = username.trim().replace(/^@/, "");
    if (!q) {
      setError("닉네임을 입력해 주세요.");
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/users/lookup?username=${encodeURIComponent(q)}`);
    if (!res.ok) {
      setError("유저를 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    const { id } = await res.json();
    const result = await getOrCreateDM(id);
    setLoading(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("room" in result && result.room) {
      const base = `/messages/${result.room.id}`;
      if (shareText) {
        router.push(`${base}?send=${encodeURIComponent(shareText)}`);
      } else {
        router.push(base);
      }
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-3 border-b border-border/60 shrink-0">
        <Link href="/messages" className="p-2 rounded-full hover:bg-muted/80">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-bold text-lg">새 메시지</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-6">
        {shareText ? (
          <section className="rounded-2xl border border-violet-500/25 bg-violet-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-700">
              <Radio className="h-4 w-4" />
              {shareLabel} 링크 보내기
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              받는 사람을 선택하면 아래 라이브 링크가 자동으로 전송됩니다.
            </p>
            <p className="text-xs rounded-xl bg-background/80 border border-border/60 px-3 py-2 whitespace-pre-wrap break-all">
              {shareText}
            </p>
          </section>
        ) : null}
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Search className="h-4 w-4" />
            닉네임으로 찾기
          </div>
          <form onSubmit={startDm} className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-2xl h-12 pl-8 text-base"
                autoFocus
                autoComplete="off"
              />
            </div>
            {error && <p className="text-sm text-destructive px-1">{error}</p>}
            <Button type="submit" className="w-full rounded-2xl h-11" disabled={loading}>
              {loading ? "확인 중…" : "대화 시작"}
            </Button>
          </form>
        </section>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <span className="relative flex justify-center text-xs text-muted-foreground bg-background px-2">
            또는
          </span>
        </div>

        <section className="rounded-2xl border border-border/60 p-4 space-y-3 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">단체대화방</p>
              <p className="text-xs text-muted-foreground">코스어 방(공지·투표) · 친목 방(단체 통화)</p>
            </div>
          </div>
          <Button asChild className="w-full rounded-2xl">
            <Link href="/messages/groups/new">단체방 만들기</Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-2xl">
            <Link href="/messages/join">입장 코드로 들어가기</Link>
          </Button>
        </section>

        <p className="text-center text-xs text-muted-foreground px-2">
          모욕, 비난, 성희롱 및 불법 행위는 법적 처벌 대상이 될 수 있습니다.
        </p>
      </div>
    </div>
  );
}
