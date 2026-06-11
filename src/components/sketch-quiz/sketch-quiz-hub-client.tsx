"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { PencilLine, PlusCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { generateRoomCode, isValidRoomCode } from "@/lib/sketch-quiz-words";

export function SketchQuizHubClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function createRoom() {
    const code = generateRoomCode();
    router.push(`/sketch-quiz/${code}`);
  }

  function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!isValidRoomCode(code)) {
      setError("4~8자 영문·숫자 방 코드를 입력하세요.");
      return;
    }
    setError(null);
    router.push(`/sketch-quiz/${code}?join=1`);
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3 max-w-lg mx-auto">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-folk-terracotta/15 border-2 border-folk-cobalt/20">
          <PencilLine className="h-7 w-7 text-folk-terracotta" />
        </div>
        <h1 className="text-2xl font-display font-bold">스케치퀴즈</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          캐치마인드처럼 한 명이 그리고, 나머지가 정답을 맞히는 실시간 그림 퀴즈.
          <br />
          애니·게임·서브컬처 단어로 MoCoMo 친구들과 가볍게 즐겨 보세요.
        </p>
      </div>

      {!session?.user ? (
        <Card className="max-w-md mx-auto border-2 border-folk-cobalt/20">
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground">로그인 후 방을 만들거나 참여할 수 있습니다.</p>
            <Link href="/auth/signin?callbackUrl=/sketch-quiz">
              <Button className="rounded-xl gap-2">
                <LogIn className="h-4 w-4" />
                로그인
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <Card className="border-2 border-folk-terracotta/30 bg-folk-cream/30">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-display font-bold">새 방 만들기</h2>
              <p className="text-sm text-muted-foreground">
                방 코드가 생성됩니다. 링크를 공유해 친구를 초대하세요.
              </p>
              <Button
                type="button"
                className="w-full rounded-xl gap-2 bg-folk-terracotta hover:bg-folk-terracotta-dark"
                onClick={createRoom}
              >
                <PlusCircle className="h-4 w-4" />
                방 만들기
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-folk-cobalt/20">
            <CardContent className="p-6 space-y-4">
              <h2 className="font-display font-bold">방 코드로 참여</h2>
              <form onSubmit={joinRoom} className="space-y-3">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="예: ABC123"
                  className="rounded-xl border-2 font-mono uppercase tracking-widest text-center"
                  maxLength={8}
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" variant="outline" className="w-full rounded-xl">
                  참여하기
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="max-w-xl mx-auto rounded-xl border-2 border-dashed border-folk-cobalt/20 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">플레이 방법</p>
        <p>1. 방장이 게임 시작 (2명 이상)</p>
        <p>2. 순서대로 출제자가 제시어를 보고 캔버스에 그림</p>
        <p>3. 나머지는 채팅으로 정답 입력 · 먼저 맞히면 10점, 출제자 5점</p>
        <p>4. 라운드당 80초 · 모든 라운드 후 순위 발표</p>
      </div>
    </div>
  );
}
