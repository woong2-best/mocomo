# Archived: games, APT, and the APT economy

The game feature was removed from the web product. Everything here keeps its original repo path
(`archive/games/<original path>`), so restoring a file is a `git mv` back to the same place.

This folder is not built, linted, type-checked, or scanned:

- `tsconfig.json` excludes `archive`.
- `.eslintrc.json` has `ignorePatterns: ["archive/**"]`.
- `next build` only compiles `src/app`; `i18n:check`, `i18n:keys`, and the Hangul scans read `src` only.

Game strings were not translated. `src/lib/i18n/locales/en-games.json` holds the en.json keys that
only game code used (`scripts/games-archive/split-en-keys.mjs`).

## Contents

| Area | Paths |
|---|---|
| Pages | `src/app/{games,play,sketch-quiz,liar-game,apt,diorama,omok,rps,word-chain}`, `src/app/admin/economy` |
| APIs | `src/app/api/{minigames,apt,mobile/games,economy,iap,cron/iap-retry,cron/iap-voided}` |
| Components | `src/components/{games,minigames,sketch-quiz,spot-diff,chess,baduk,janggi,omok,reversi,tower-rush,piano-rush,parking-rush,liar-game,apt,activities}`, chat game-share card, profile minigame panels, live overlay games (quiz, chosung quiz, word guess, wheel, games hub link), APT/economy admin panels |
| Lib / hooks / actions | `src/lib/{minigames,apt,diorama,activities}`, games catalog/lobby, sketch-quiz words, APT gate/route, live overlay game helpers, `use-minigame-*`, `use-sketch-quiz-*`, `use-apt-*`, `src/actions/apt*`, `admin-*economy*`, `admin-{cs,flea,fraud*,gold-shop,market}` |
| Socket server | `server/minigames`, `server/word-chain`, APT home/world stores, liar-game and sketch-quiz stores; removed handler wiring in `server/socket-game-handlers.ts.txt` |
| Assets | `public/{apt,diorama,chess,piano-rush,spot-diff}`, root `games/` |
| CSS | `src/app/globals-games.css` (Piano Rush + APT rules cut from `globals.css`) |
| Scripts | APT/diorama capture and diagnostic scripts, word-chain dictionary builder |
| Snapshots | `snapshots/<path>` — byte-exact copies of shared files (live overlays, avatar compositor) before game code was cut out of them |

## Runtime behavior after removal

- Old pages (`/games`, `/play`, `/sketch-quiz`, `/liar-game`, `/apt`, `/diorama`, `/omok`, `/rps`,
  `/word-chain`, `/admin/economy`, and sub-paths) redirect to `/` in `src/middleware.ts`.
- Old APIs under the paths above return `410 {"error":"This feature has been removed."}`.
  Google Play RTDN / IAP retries to `/api/iap/*` also get 410.
- Prefix lists live in `src/lib/removed-game-routes.ts`.

## Data

No Prisma model, column, enum, or migration was changed, and no rows were deleted or rewritten.

- APT gold, gems, IAP purchases, inventory, market, and APT notifications live only in `Apt*`
  tables. They stay in the database untouched; nothing in the live app reads them now.
- Minigame matches, ratings, seasons, and achievements live only in `Minigame*` tables — untouched.
- The platform wallet (`Wallet`, `LedgerEntry`, `MocoTransactionHistory`, MOCO top-ups, gems,
  flowers) never recorded game transactions, so wallet history shows nothing game-related and
  needed no change.
- Old chat messages that contain a `[[mocomo:game-share:…]]` invite are stored as-is; the marker is
  stripped at render time (`src/lib/chat-legacy-game-share.ts`).
- Saved live overlay layouts may still contain game widgets; `normalizeOverlayState` keeps text
  widgets only when loading.
