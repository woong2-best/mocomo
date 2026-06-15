"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { notFound } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Crown, Infinity, Layers, Music, Trophy, Users, Car, Timer, Bot, Grid3X3 } from "lucide-react";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";
import { MinigameHubShell } from "@/components/minigames/minigame-hub-shell";
import { ChessPuzzlePanel } from "@/components/chess/chess-puzzle-panel";
import { SpotDiffLeaderboard } from "@/components/spot-diff/spot-diff-leaderboard";
import { PianoRushLeaderboard } from "@/components/piano-rush/piano-rush-leaderboard";
import { PianoSongPicker } from "@/components/piano-rush/piano-song-picker";
import { ParkingLevelPicker } from "@/components/parking-rush/parking-level-picker";
import { ParkingColorPicker } from "@/components/parking-rush/parking-color-picker";
import { ParkingRushLeaderboard } from "@/components/parking-rush/parking-rush-leaderboard";
import { ParkingRushTournamentPanel } from "@/components/parking-rush/parking-rush-tournament-panel";
import type { CarColorId } from "@/lib/minigames/parking-rush-logic";
import { TOWER_MAPS } from "@/lib/minigames/tower-rush-theme";
import type { TowerMapId } from "@/lib/minigames/tower-rush-logic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  saveGameCreateOptions,
  isValidGameRoomPassword,
  MIN_GAME_ROOM_PASSWORD_LENGTH,
  type GamePlayMode,
} from "@/lib/games-lobby";
import { generateRoomCode } from "@/lib/sketch-quiz-words";
import type { OmokAiDifficulty } from "@/lib/minigames/omok-ai";
import { cn } from "@/lib/utils";

const OMOK_DIFFICULTY_OPTIONS: { id: OmokAiDifficulty; label: string; hint: string }[] = [
  { id: "easy", label: "EASY", hint: "가끔 실수 · 초보에게 적합" },
  { id: "normal", label: "NORMAL", hint: "균형 잡힌 휴리스틱 AI" },
  { id: "hard", label: "HARD", hint: "3수 앞 minimax · 강함" },
];

export function PlayHubClient({ gameId }: { gameId: string }) {
  const game = getMinigameById(gameId);
  const router = useRouter();
  const { data: session } = useSession();
  const [mode, setMode] = useState<GamePlayMode>("friends");
  const [chessTab, setChessTab] = useState<"play" | "puzzle">("play");
  const [spotTab, setSpotTab] = useState<"play" | "infinite">("play");
  const [pianoTab, setPianoTab] = useState<"duel" | "solo" | "battle" | "rank">("duel");
  const [infPassword, setInfPassword] = useState("1234");
  const [pianoPassword, setPianoPassword] = useState("1234");
  const [infError, setInfError] = useState<string | null>(null);
  const [pianoError, setPianoError] = useState<string | null>(null);
  const [pianoChartId, setPianoChartId] = useState("pd-nocturne-eb-op9-2");

  if (!game || game.status === "coming_soon" || !game.href) notFound();

  const Icon = game.icon;
  const routeBase = getMinigameRoute(gameId);
  const isChess = gameId === "chess";
  const isSpotDiff = gameId === "spot-diff";
  const isPianoRush = gameId === "piano-rush";
  const isParkingRush = gameId === "parking-rush";
  const isTowerRush = gameId === "tower-rush";
  const isOmok = gameId === "omok";
  const [parkingTab, setParkingTab] = useState<"solo" | "duel" | "ranked" | "time_attack" | "tournament">("duel");
  const [towerTab, setTowerTab] = useState<"solo" | "duel" | "battle">("duel");
  const [omokTab, setOmokTab] = useState<"solo" | "multi">("multi");
  const [omokDifficulty, setOmokDifficulty] = useState<OmokAiDifficulty>("normal");
  const [omokRuleMode, setOmokRuleMode] = useState<"free" | "renju">("free");
  const [omokPassword, setOmokPassword] = useState("1234");
  const [omokError, setOmokError] = useState<string | null>(null);
  const [towerMapId, setTowerMapId] = useState<TowerMapId>("city");
  const [towerPassword, setTowerPassword] = useState("1234");
  const [towerError, setTowerError] = useState<string | null>(null);
  const [parkingLevelId, setParkingLevelId] = useState("lot-beginner");
  const [parkingPassword, setParkingPassword] = useState("1234");
  const [parkingError, setParkingError] = useState<string | null>(null);
  const [parkingCarColor, setParkingCarColor] = useState<CarColorId>("cyan");

  function startInfinite() {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(infPassword)) {
      setInfError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: infPassword.trim(),
      spotDiffPlayStyle: "infinite",
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  function startPianoMode(mode: "solo" | "battle") {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(pianoPassword)) {
      setPianoError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: pianoPassword.trim(),
      pianoRushMode: mode,
      pianoRushChartId: pianoChartId,
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  function startParkingMode(mode: "solo" | "time_attack") {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(parkingPassword)) {
      setParkingError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: parkingPassword.trim(),
      parkingRushMode: mode,
      parkingRushLevelId: parkingLevelId,
      parkingRushCarColor: parkingCarColor,
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  function startTowerMode(mode: "solo" | "duel" | "battle_royale") {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(towerPassword)) {
      setTowerError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: towerPassword.trim(),
      towerRushMode: mode,
      towerRushMapId: towerMapId,
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  function startOmokSolo() {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${routeBase}`);
      return;
    }
    if (!isValidGameRoomPassword(omokPassword)) {
      setOmokError(`비밀번호는 ${MIN_GAME_ROOM_PASSWORD_LENGTH}~32자입니다.`);
      return;
    }
    setOmokError(null);
    const code = generateRoomCode();
    saveGameCreateOptions(gameId, {
      password: omokPassword.trim(),
      ruleMode: omokRuleMode,
      omokMode: "solo",
      omokAiDifficulty: omokDifficulty,
    });
    router.push(`${routeBase}/${code}?create=1`);
  }

  return (
    <div className="space-y-4">
      {isChess && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setChessTab("play")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              chessTab === "play" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            대국
          </button>
          <button
            type="button"
            onClick={() => setChessTab("puzzle")}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              chessTab === "puzzle" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            퍼즐
          </button>
        </div>
      )}

      {isSpotDiff && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-sm mx-auto">
          <button
            type="button"
            onClick={() => setSpotTab("play")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
              spotTab === "play" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            대전/협동
          </button>
          <button
            type="button"
            onClick={() => setSpotTab("infinite")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
              spotTab === "infinite" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Infinity className="h-3.5 w-3.5" />
            무한
          </button>
        </div>
      )}

      {isPianoRush && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-lg mx-auto flex-wrap">
          {(
            [
              ["duel", "1:1", Users],
              ["solo", "싱글", Music],
              ["battle", "배틀", Users],
              ["rank", "랭킹", Trophy],
            ] as const
          ).map(([id, label, TabIcon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPianoTab(id)}
              className={cn(
                "flex-1 min-w-[4.5rem] rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1",
                pianoTab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {isParkingRush && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-lg mx-auto flex-wrap">
          {(
            [
              ["duel", "대전", Users],
              ["solo", "싱글", Car],
              ["ranked", "랭크", Trophy],
              ["time_attack", "타임", Timer],
              ["tournament", "토너", Crown],
            ] as const
          ).map(([id, label, TabIcon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setParkingTab(id)}
              className={cn(
                "flex-1 min-w-[4rem] rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1",
                parkingTab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {isTowerRush && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-md mx-auto">
          {(
            [
              ["solo", "싱글", Layers],
              ["duel", "1:1", Users],
              ["battle", "배틀로얄", Crown],
            ] as const
          ).map(([id, label, TabIcon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTowerTab(id)}
              className={cn(
                "flex-1 rounded-lg px-2 py-2 text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1",
                towerTab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {isOmok && (
        <div className="flex justify-center gap-1 p-1 rounded-xl bg-muted/60 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setOmokTab("multi")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
              omokTab === "multi" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            대전
          </button>
          <button
            type="button"
            onClick={() => setOmokTab("solo")}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1",
              omokTab === "solo" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Bot className="h-3.5 w-3.5" />
            vs CPU
          </button>
        </div>
      )}

      {isParkingRush && parkingTab !== "ranked" && parkingTab !== "tournament" && (
        <div className="max-w-md mx-auto space-y-3">
          <ParkingLevelPicker levelId={parkingLevelId} onLevelId={setParkingLevelId} />
          <ParkingColorPicker value={parkingCarColor} onChange={setParkingCarColor} />
        </div>
      )}

      {isTowerRush && towerTab !== "duel" && (
        <div className="max-w-md mx-auto">
          <label className="text-xs text-muted-foreground block mb-1">맵 선택</label>
          <select
            className="w-full border rounded-lg px-3 py-2 text-sm bg-background"
            value={towerMapId}
            onChange={(e) => setTowerMapId(e.target.value as TowerMapId)}
          >
            {TOWER_MAPS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isPianoRush && pianoTab !== "rank" && (
        <div className="max-w-md mx-auto">
          <PianoSongPicker value={pianoChartId} onChange={setPianoChartId} />
        </div>
      )}

      {isChess && chessTab === "puzzle" ? (
        <ChessPuzzlePanel />
      ) : isSpotDiff && spotTab === "infinite" ? (
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-2 border-folk-cobalt/20">
            <CardContent className="p-6 space-y-4 text-center">
              <Infinity className="h-10 w-10 mx-auto text-folk-cobalt" />
              <div>
                <h2 className="font-display font-bold text-lg">무한 모드</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  5분 제한 · 클리어할 때마다 +30초 · 카탈로그 문제 연속 출제
                </p>
              </div>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
                value={infPassword}
                onChange={(e) => setInfPassword(e.target.value)}
              />
              {infError && <p className="text-xs text-destructive">{infError}</p>}
              <Button className="w-full rounded-xl" onClick={startInfinite}>
                무한 모드 시작
              </Button>
              {!session?.user && (
                <p className="text-xs text-muted-foreground">
                  <Link href={`/auth/signin?callbackUrl=${routeBase}`} className="underline">
                    로그인
                  </Link>
                  후 기록이 저장됩니다.
                </p>
              )}
            </CardContent>
          </Card>
          <SpotDiffLeaderboard />
        </div>
      ) : isParkingRush && parkingTab === "ranked" ? (
        <div className="max-w-md mx-auto space-y-4">
          <ParkingRushLeaderboard />
        </div>
      ) : isParkingRush && parkingTab === "tournament" ? (
        <ParkingRushTournamentPanel routeBase={routeBase} />
      ) : isTowerRush && (towerTab === "solo" || towerTab === "battle") ? (
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-2 border-indigo-500/25">
            <CardContent className="p-6 space-y-4 text-center">
              <Layers className="h-10 w-10 mx-auto text-indigo-400" />
              <div>
                <h2 className="font-display font-bold text-lg">
                  {towerTab === "solo" ? "싱글 타워" : "배틀로얄"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {towerTab === "solo"
                    ? "클릭/Space로 블록 쌓기 · Perfect 정렬 · 최고 층 도전"
                    : "최대 50명 · 붕괴 시 탈락 · 마지막 생존자 우승"}
                </p>
              </div>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
                value={towerPassword}
                onChange={(e) => setTowerPassword(e.target.value)}
              />
              {towerError && <p className="text-xs text-destructive">{towerError}</p>}
              <Button
                className="w-full rounded-xl"
                onClick={() => startTowerMode(towerTab === "solo" ? "solo" : "battle_royale")}
              >
                {towerTab === "solo" ? "싱글 시작" : "배틀 방 만들기"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : isParkingRush && (parkingTab === "solo" || parkingTab === "time_attack") ? (
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-2 border-cyan-500/25">
            <CardContent className="p-6 space-y-4 text-center">
              <Car className="h-10 w-10 mx-auto text-cyan-400" />
              <div>
                <h2 className="font-display font-bold text-lg">
                  {parkingTab === "solo" ? "싱글 플레이" : "타임어택"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {parkingTab === "solo"
                    ? "로우폴리 3D · 충돌 없이 정확히 주차 · 점수·티어"
                    : "제한 시간 내 주차 · 빠를수록 보너스"}
                </p>
              </div>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
                value={parkingPassword}
                onChange={(e) => setParkingPassword(e.target.value)}
              />
              {parkingError && <p className="text-xs text-destructive">{parkingError}</p>}
              <Button className="w-full rounded-xl" onClick={() => startParkingMode(parkingTab)}>
                {parkingTab === "solo" ? "싱글 시작" : "타임어택 시작"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : isOmok && omokTab === "solo" ? (
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-2 border-folk-terracotta/30">
            <CardContent className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <Grid3X3 className="h-10 w-10 mx-auto text-folk-terracotta" />
                <h2 className="font-display font-bold text-lg">CPU 대전</h2>
                <p className="text-sm text-muted-foreground">
                  흑(선공)으로 CPU와 대국 · 외부 AI 없이 내장 엔진
                </p>
              </div>
              <div className="flex gap-3 text-xs justify-center">
                <label className="flex items-center gap-1">
                  <input type="radio" checked={omokRuleMode === "free"} onChange={() => setOmokRuleMode("free")} />
                  자유
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" checked={omokRuleMode === "renju"} onChange={() => setOmokRuleMode("renju")} />
                  렌주
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {OMOK_DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setOmokDifficulty(opt.id)}
                    className={cn(
                      "rounded-xl border-2 px-2 py-3 text-center transition-colors",
                      omokDifficulty === opt.id
                        ? "border-folk-terracotta bg-folk-terracotta/10"
                        : "border-muted hover:border-folk-cobalt/30"
                    )}
                  >
                    <span className="block text-xs font-bold">{opt.label}</span>
                    <span className="block text-[10px] text-muted-foreground mt-1 leading-tight">{opt.hint}</span>
                  </button>
                ))}
              </div>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
                value={omokPassword}
                onChange={(e) => setOmokPassword(e.target.value)}
              />
              {omokError && <p className="text-xs text-destructive text-center">{omokError}</p>}
              <Button className="w-full rounded-xl" onClick={startOmokSolo}>
                {OMOK_DIFFICULTY_OPTIONS.find((o) => o.id === omokDifficulty)?.label} CPU와 대국
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : isPianoRush && pianoTab === "rank" ? (
        <div className="max-w-md mx-auto space-y-4">
          <PianoRushLeaderboard />
        </div>
      ) : isPianoRush && (pianoTab === "solo" || pianoTab === "battle") ? (
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="border-2 border-violet-500/25">
            <CardContent className="p-6 space-y-4 text-center">
              <Music className="h-10 w-10 mx-auto text-violet-400" />
              <div>
                <h2 className="font-display font-bold text-lg">
                  {pianoTab === "solo" ? "싱글 플레이" : "배틀로얄"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {pianoTab === "solo"
                    ? "혼자 연주 · 점수 기록 · 랭킹 반영"
                    : "최대 50명 · 실수 3회 시 탈락 · 마지막까지 생존"}
                </p>
              </div>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder={`방 비밀번호 (${MIN_GAME_ROOM_PASSWORD_LENGTH}자 이상)`}
                value={pianoPassword}
                onChange={(e) => setPianoPassword(e.target.value)}
              />
              {pianoError && <p className="text-xs text-destructive">{pianoError}</p>}
              <Button className="w-full rounded-xl" onClick={() => startPianoMode(pianoTab)}>
                {pianoTab === "solo" ? "싱글 시작" : "배틀 방 만들기"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : isOmok && omokTab === "multi" ? (
        <>
          <MinigameHubShell
            gameId={gameId}
            routeBase={routeBase}
            title={game.name}
            description={game.description}
            icon={Icon}
            mode={mode}
            onModeChange={setMode}
          />
        </>
      ) : (
        <>
          <MinigameHubShell
            gameId={gameId}
            routeBase={routeBase}
            title={game.name}
            description={game.description}
            icon={Icon}
            mode={mode}
            onModeChange={setMode}
            createOptionsExtra={
              isPianoRush && pianoTab === "duel"
                ? { pianoRushMode: "duel", pianoRushChartId: pianoChartId }
                : isParkingRush && (parkingTab === "duel" || parkingTab === "ranked")
                  ? {
                      parkingRushMode: parkingTab === "ranked" ? "ranked" : "duel",
                      parkingRushLevelId: parkingLevelId,
                      parkingRushCarColor: parkingCarColor,
                    }
                  : isTowerRush && towerTab === "duel"
                    ? { towerRushMode: "duel" as const, towerRushMapId: towerMapId }
                    : undefined
            }
          />
          {isSpotDiff && <SpotDiffLeaderboard limit={5} />}
          {isPianoRush && pianoTab === "duel" && <PianoRushLeaderboard />}
          {isParkingRush && parkingTab === "duel" && <ParkingRushLeaderboard />}
        </>
      )}
    </div>
  );
}
