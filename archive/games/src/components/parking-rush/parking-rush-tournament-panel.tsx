"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Crown, Swords, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ParkingLevelPicker } from "@/components/parking-rush/parking-level-picker";
import { ParkingColorPicker } from "@/components/parking-rush/parking-color-picker";
import {
  generateRoomCode,
} from "@/lib/sketch-quiz-words";
import {
  isValidGameRoomPassword,
  MIN_GAME_ROOM_PASSWORD_LENGTH,
  saveGameCreateOptions,
} from "@/lib/games-lobby";
import type { CarColorId } from "@/lib/minigames/parking-rush-logic";

type Props = {
  routeBase: string;
};

export function ParkingRushTournamentPanel({ routeBase }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [levelId, setLevelId] = useState("airport-expert");
  const [carColor, setCarColor] = useState<CarColorId>("gold");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState<string | null>(null);

  function startTournament() {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(password)) {
      setError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    const code = generateRoomCode();
    saveGameCreateOptions("parking-rush", {
      password: password.trim(),
      parkingRushMode: "ranked",
      parkingRushLevelId: levelId,
      parkingRushCarColor: carColor,
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <Card className="border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-950/20 to-black/40">
        <CardContent className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <Crown className="h-10 w-10 mx-auto text-yellow-400" />
            <h2 className="font-display font-bold text-lg">주차 러쉬 토너먼트</h2>
            <p className="text-sm text-muted-foreground">
              최대 16명 · 실시간 브래킷 · 최초 주차 성공자 우승 · 시즌 포인트 2배
            </p>
          </div>

          <ul className="text-xs space-y-1.5 text-muted-foreground">
            <li className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-cyan-400" /> 16인 실시간 동시 주차
            </li>
            <li className="flex items-center gap-2">
              <Swords className="h-3.5 w-3.5 text-violet-400" /> 서버 판정 · 치트 방지
            </li>
            <li className="flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-yellow-400" /> 우승 시 시즌·업적 반영
            </li>
          </ul>

          <ParkingLevelPicker levelId={levelId} onLevelId={setLevelId} />
          <ParkingColorPicker value={carColor} onChange={setCarColor} />

          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button className="w-full rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 font-bold" onClick={startTournament}>
            토너먼트 방 만들기
          </Button>
          <p className="text-[11px] text-center text-muted-foreground">
            친구 초대 후 16명 모이면 자동 시작 · 관전·리플레이 지원
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
