/** Game, APT and minigame routes were removed (code archived under /archive/games). */
const REMOVED_PAGE_PREFIXES = [
  "/games",
  "/play",
  "/sketch-quiz",
  "/liar-game",
  "/apt",
  "/diorama",
  "/omok",
  "/rps",
  "/word-chain",
  "/admin/economy",
];

const REMOVED_API_PREFIXES = [
  "/api/minigames",
  "/api/apt",
  "/api/mobile/games",
  "/api/economy",
  "/api/iap",
  "/api/cron/iap-retry",
  "/api/cron/iap-voided",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isRemovedGamePagePath(pathname: string): boolean {
  return matchesPrefix(pathname, REMOVED_PAGE_PREFIXES);
}

export function isRemovedGameApiPath(pathname: string): boolean {
  return matchesPrefix(pathname, REMOVED_API_PREFIXES);
}
