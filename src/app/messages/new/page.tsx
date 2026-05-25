"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getOrCreateDM, createChatRoom } from "@/actions/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, MessageCircle, Search, Users } from "lucide-react";

export default function NewMessagePage() {
  const router = useRouter();
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
    if ("room" in result && result.room) router.push(`/messages/${result.room.id}`);
  }

  async function createPublic() {
    setLoading(true);
    const result = await createChatRoom({ name: "새 팬덤방", type: "FANDOM" });
    setLoading(false);
    if (result.room) router.push(`/messages/${result.room.id}`);
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
              <p className="font-semibold text-sm">팬덤 · 친목방</p>
              <p className="text-xs text-muted-foreground">여러 명이 함께 대화하는 방</p>
            </div>
          </div>
          <Button variant="outline" className="w-full rounded-2xl" onClick={createPublic} disabled={loading}>
            방 만들기
          </Button>
        </section>

        <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          DM은 인스타·카톡처럼 1:1 대화예요
        </p>
      </div>
    </div>
  );
}
