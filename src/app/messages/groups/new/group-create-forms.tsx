"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createCosplayerGroupRoom, createSocialGroupRoom } from "@/actions/group-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Copy, Shield, Users } from "lucide-react";
import { useClientPlatform } from "@/components/providers/client-platform-provider";
import { cn } from "@/lib/utils";

export function GroupCreateForms({ isCosplayer }: { isCosplayer: boolean }) {
  const router = useRouter();
  const { isNativeApp } = useClientPlatform();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{
    roomId: string;
    joinCode?: string;
    password?: string;
    openLink?: boolean;
    kind: "cosplayer" | "social";
  } | null>(null);

  async function createCosplayer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const name = new FormData(e.currentTarget).get("name") as string;
    const res = await createCosplayerGroupRoom(name);
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("room" in res && res.room && res.joinCode) {
      setCreated({
        roomId: res.room.id,
        joinCode: res.joinCode,
        kind: "cosplayer",
      });
    }
  }

  async function createSocial(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const usePassword = form.get("usePassword") === "on";
    const customPassword = (form.get("customPassword") as string) || undefined;
    const res = await createSocialGroupRoom({ name, usePassword, customPassword });
    setLoading(false);
    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }
    if ("room" in res && res.room) {
      setCreated({
        roomId: res.room.id,
        joinCode: res.joinCode,
        password: res.password,
        openLink: res.openLink,
        kind: "social",
      });
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
  }

  if (created) {
    const inviteLink =
      typeof window !== "undefined"
        ? `${window.location.origin}/messages/join?room=${created.roomId}`
        : `/messages/join?room=${created.roomId}`;

    return (
      <div className={cn("flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-4", isNativeApp && "pb-native-fab")}>
        <h1 className="text-xl font-bold text-center">단체방이 만들어졌어요</h1>
        {created.joinCode ? (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">입장 코드 (직접 공유)</p>
            <p className="text-3xl font-black tracking-[0.35em]">{created.joinCode}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1"
              onClick={() => copyText(created.joinCode!)}
            >
              <Copy className="h-3.5 w-3.5" />
              코드 복사
            </Button>
          </div>
        ) : null}
        {created.password && !created.joinCode ? (
          <div className="rounded-2xl border p-4 text-center space-y-2">
            <p className="text-sm text-muted-foreground">비밀번호</p>
            <p className="text-lg font-bold">{created.password}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => copyText(created.password!)}
            >
              비밀번호 복사
            </Button>
          </div>
        ) : null}
        {created.openLink ? (
          <div className="rounded-2xl border p-4 text-sm space-y-2">
            <p className="text-muted-foreground">비밀번호 없이 링크로 입장</p>
            <p className="text-xs break-all font-mono bg-muted/50 rounded-lg p-2">{inviteLink}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={() => copyText(inviteLink)}
            >
              링크 복사
            </Button>
          </div>
        ) : null}
        <Button className="w-full rounded-2xl" onClick={() => router.push(`/messages/${created.roomId}`)}>
          채팅방 들어가기
        </Button>
        <Button variant="ghost" className="w-full rounded-2xl" asChild>
          <Link href="/messages">대화 목록</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full space-y-6", isNativeApp && "pb-native-fab")}>
      <header className="flex items-center gap-2">
        <Link href="/messages/new" className="p-2 rounded-full hover:bg-muted/80">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        {!isNativeApp ? (
          <h1 className="font-bold text-lg">단체대화방 만들기</h1>
        ) : (
          <h1 className="sr-only">단체대화방 만들기</h1>
        )}
      </header>

      {isCosplayer ? (
        <section className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-violet-600" />
            <div>
              <p className="font-semibold">코스어 단체방</p>
              <p className="text-xs text-muted-foreground">코스어만 개설 · 공지 · 투표 · 6자리 입장 코드</p>
            </div>
          </div>
          <form onSubmit={createCosplayer} className="space-y-2">
            <Input name="name" placeholder="방 이름 (예: 원신 코스어 모임)" required className="rounded-xl" />
            <Button type="submit" className="w-full rounded-xl" disabled={loading}>
              {loading ? "만드는 중…" : "코스어 단체방 만들기"}
            </Button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground rounded-xl border px-3 py-2">
          코스어 단체방은{" "}
          <Link href="/cosplay/apply" className="text-primary underline">
            코스어 등록
          </Link>
          후 만들 수 있어요.
        </p>
      )}

      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">친목 단체방</p>
            <p className="text-xs text-muted-foreground">단체 통화 · 비밀번호 선택/해제</p>
          </div>
        </div>
        <form onSubmit={createSocial} className="space-y-3">
          <Input name="name" placeholder="방 이름 (예: 주말 친목방)" required className="rounded-xl" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="usePassword" className="rounded" />
            입장 비밀번호 사용
          </label>
          <Input
            name="customPassword"
            placeholder="비밀번호 (비우면 6자리 자동 생성)"
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            체크를 끄면 링크만으로 누구나 입장할 수 있어요.
          </p>
          <Button type="submit" variant="outline" className="w-full rounded-xl" disabled={loading}>
            {loading ? "만드는 중…" : "친목 단체방 만들기"}
          </Button>
        </form>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
