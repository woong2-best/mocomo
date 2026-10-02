# Removed mobile game entry points

Code removed from `apps/mobile` when the game feature was retired. The screen itself lives in
`apps/mobile/src/features/games/` under this folder. Nothing here is compiled by Metro, tsc, or Gradle.

## `src/navigation/RootNavigator.tsx`

```tsx
<Stack.Screen
  name="GamesHub"
  getComponent={() => require("@/features/games/GamesHubScreen").GamesHubScreen}
/>
```

## `src/navigation/types.ts`

```ts
// StackRouteName union
| "GamesHub"
// RootStackParamList
GamesHub: undefined;
```

## `src/api/paths.ts`

```ts
games: "/api/mobile/games",
```

## `src/api/discovery.ts`

```ts
export async function fetchGames() {
  return apiRequest<{
    items: {
      id: string;
      name: string;
      href: string | null;
      description: string | null;
      category: string;
      status: string;
    }[];
  }>(MobileApi.games, { auth: true });
}
```

## `src/features/discover/DiscoverHubScreen.tsx`

```tsx
{
  title: u("게임", "Games"),
  subtitle: u("미니게임 허브", "Mini-game hub"),
  target: { kind: "stack", route: "GamesHub" },
  icon: "game-controller-outline",
},
```

## `src/features/messages/MessageRoomScreen.tsx` (chat composer)

```tsx
{!recording ? (
  <Pressable
    onPress={() => navigation.navigate("GamesHub")}
    disabled={busy}
    hitSlop={8}
    style={styles.pillIcon}
    accessibilityLabel={t("nav.games")}
  >
    <Ionicons name="game-controller-outline" size={22} color={colors.cobalt} />
  </Pressable>
) : null}
```

## `scripts/scan-bare-hangul.mjs`

`"src/features/games"` was in the scanned-folder list.

## Not game code (kept)

- Live streaming category `GAME` (`live-categories.ts`, `LiveSlantTabs.tsx`, `live-folder-rack-assets.ts`).
- Community label `GAME` (`community-labels.ts`, `community-labels-i18n.ts`).
- Used-market `BOARDGAME` category (`used-catalog.ts`).
- `AccountCartridgeSheet.tsx` — account switcher styled like a game cartridge.

There were no game deep links, Android manifest intent-filters, push routes, or bundled game assets.
The server endpoint `/api/mobile/games` now returns HTTP 410.
