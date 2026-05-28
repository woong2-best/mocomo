"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { joinGroupRoomByCode, joinGroupRoomById } from "@/actions/group-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, KeyRound } from "lucide-react";

function JoinGroupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetRoom = searchParams.get("room") ?? "";
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await joinGroupRoomByCode(code);
    setLoading(false);
    if ("error" in res && res.error) setError(res.error);
    else if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  async function joinByRoom(e: React.FormEvent) {
    e.preventDefault();
    if (!presetRoom) return;
    setLoading(true);
    setError("");
    const res = await joinGroupRoomById(presetRoom, password || undefined);
    setLoading(false);
    if ("error" in res && res.error) setError(res.error);
    else if ("roomId" in res && res.roomId) router.push(`/messages/${res.roomId}`);
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-2 px-3 py-3 border-b border-border/60 shrink-0">
        <Link href="/messages" className="p-2 rounded-full hover:bg-muted/80">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-bold text-lg">단체방 입장</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-6">
        {presetRoom ? (
          <section className="rounded-2xl border p-4 space-y-3">
            <p className="text-sm font-medium">초대 링크로 입장</p>
            <p className="text-xs text-muted-foreground break-all font-mono">{presetRoom}</p>
            <form onSubmit={joinByRoom} className="space-y-2">
              <Input
                type="password"
                placeholder="비밀번호 (없으면 비워 두세요)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl"
                autoComplete="off"
              />
              <Button type="submit" className="w-full rounded-xl" disabled={loading}>
                {loading ? "입장 중…" : "입장하기"}
              </Button>
            </form>
          </section>
        ) : null}

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <span className="relative flex justify-center text-xs text-muted-foreground bg-background px-2">
            {presetRoom ? "또는 코드로 입장" : "입장 코드"}
          </span>
        </div>

        <section className="rounded-2xl border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <KeyRound className="h-4 w-4" />
            6자리 입장 코드
          </div>
          <form onSubmit={joinByCode} className="space-y-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="예: A3K9M2"
              className="rounded-xl text-center text-xl tracking-[0.3em] font-bold"
              maxLength={6}
              autoComplete="off"
            />
            <Button type="submit" className="w-full rounded-xl" disabled={loading || code.length < 6}>
              {loading ? "확인 중…" : "코드로 입장"}
            </Button>
          </form>
        </section>

        {error ? <p className="text-sm text-destructive text-center">{error}</p> : null}

        <p className="text-center text-sm">
          <Link href="/messages/groups/new" className="text-primary underline font-medium">
            단체방 만들기
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">불러오는 중…</div>}>
      <JoinGroupInner />
    </Suspense>
  );
}
