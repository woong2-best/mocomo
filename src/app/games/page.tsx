import { GamesHubClient } from "@/components/games/games-hub-client";

export const metadata = {
  title: "GAME | MoCoMo",
  description: "MoCoMo 게임 모음 — 스케치퀴즈 등 서브컬처 미니게임",
};

export default function GamesPage() {
  return <GamesHubClient />;
}
