import dynamic from "next/dynamic";
import { RouteLoading } from "@/components/ui/route-loading";

const GamesHubClient = dynamic(
  () => import("@/components/games/games-hub-client").then((m) => m.GamesHubClient),
  {
    loading: () => <RouteLoading chrome maxWidth="4xl" variant="grid" />,
  }
);

export const metadata = {
  title: "GAME | MoCoMo",
  description: "MoCoMo 게임 모음 — 스케치퀴즈 등 서브컬처 미니게임",
};

export default function GamesPage() {
  return <GamesHubClient />;
}
