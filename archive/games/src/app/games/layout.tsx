import { GamesPageTransition } from "@/components/games/games-page-transition";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <GamesPageTransition>{children}</GamesPageTransition>;
}
