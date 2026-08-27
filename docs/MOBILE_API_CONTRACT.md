# Mobile API contract (Phase 1 implemented)

All mobile traffic uses **`Authorization: Bearer <access>`** (except login/refresh). No session cookies.

Base: `https://mocomo.net` (override with `EXPO_PUBLIC_API_BASE_URL`).

Client paths: [`apps/mobile/src/api/paths.ts`](../apps/mobile/src/api/paths.ts).

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/mobile/auth/login` | `{ login, password, deviceId?, platform? }` → `{ accessToken, refreshToken, expiresAt, user }` |
| POST | `/api/mobile/auth/refresh` | `{ refreshToken }` → new pair (rotation) |
| POST | `/api/mobile/auth/logout` | `{ refreshToken? }` or Bearer + `{ allDevices: true }` |
| POST | `/api/mobile/auth/oauth/pkce` | Exchange AuthSession `handoff` → `{ accessToken, refreshToken, user }` (web OAuth bridge) |

Access JWT: ~1h, `typ: mocomo-mobile-access`.  
Refresh: opaque, SHA-256 in `MobileRefreshToken` (30d), rotatable/revocable.

Web cookie JWT **unchanged**.

## CSRF / Origin

`/api/mobile/` is Origin-exempt for mutating methods. **Bearer is required** on all mutating mobile routes except login/refresh. Do not widen Origin exemption globally.

## Resource routes (Phase 1)

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/mobile/feed` | Optional Bearer |
| GET | `/api/mobile/reels` | Optional Bearer |
| POST | `/api/mobile/posts/:id/like` | Bearer |
| GET/POST | `/api/mobile/posts/:id/comments` | GET optional / POST Bearer |
| POST/DELETE | `/api/mobile/comments/:id/like` | Bearer |
| POST | `/api/mobile/follow` | Bearer `{ userId, username? }` |
| GET | `/api/mobile/me` | Bearer — current user + counts |
| POST | `/api/mobile/posts` | Bearer — create post |
| POST | `/api/mobile/upload` | Bearer |
| POST/DELETE | `/api/mobile/push/register` | Bearer |
| GET | `/api/mobile/notifications` | Bearer |

| GET | `/api/mobile/messages` | Bearer — DM inbox |
| POST | `/api/mobile/messages/dm` | Bearer — `{ userId }` open/create |
| GET | `/api/mobile/messages/:roomId` | Bearer — room + messages (`?before=`) |
| POST | `/api/mobile/messages/:roomId` | Bearer — send text/attachments |
| GET | `/api/mobile/messages/:roomId/sync` | Bearer — fetch after cursor |
| GET | `/api/mobile/messages/:roomId/wait` | Bearer — long-poll (~9s) |

## Live · Marketplace · Community · Event

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/mobile/live` | Optional Bearer — live hub list |
| GET | `/api/mobile/live/:id` | Optional Bearer — detail |
| GET | `/api/mobile/live/:id/token` | Bearer — LiveKit token (`hostUserId`, `audioOnly`) |
| GET | `/api/mobile/marketplace` | Optional Bearer — used listings (`?q=&take=`) |
| POST | `/api/mobile/marketplace` | Bearer — create used listing (`meetLat`/`meetLng`/`meetCountry`/`meetPlace`) |
| GET | `/api/mobile/marketplace/:id` | Optional Bearer — detail + `map` (`country`, `engine`, `externalMapUrl`, lat/lng) |
| POST | `/api/mobile/marketplace/:id/favorite` | Bearer — toggle favorite |
| POST | `/api/mobile/marketplace/:id/trade-chat` | Bearer — open seller DM (`roomId`) |
| POST | `/api/mobile/marketplace/:id/bid` | Bearer — `{ amount }` auction bid |
| GET | `/api/mobile/community` | Optional Bearer — public communities (`?q=&take=`) |
| GET | `/api/mobile/community/:slug` | Optional Bearer — detail + recent posts + membership |
| POST | `/api/mobile/community/:slug/join` | Bearer — OPEN / APPROVE / INVITE (`inviteCode?`) |
| GET | `/api/mobile/community/:slug/channels` | Optional Bearer — TEXT channels + `voiceItems` (VOICE/VIDEO) |
| POST | `/api/mobile/community/:slug/channels` | Bearer — `{ channelSlug }` → upsert member + `roomId` |
| GET | `/api/mobile/webrtc/ice-servers` | Bearer — STUN + TURN ICE config for DM P2P |
| GET | `/api/mobile/jitsi/community-room?channelId=` | Bearer — Jitsi room + `joinUrl` for voice channels |
| GET | `/api/mobile/socket-auth` | Bearer — Socket.IO token (DM P2P signaling) |
| POST | `/api/mobile/calls` | Bearer — start DM call (P2P, no LiveKit token) |
| GET | `/api/mobile/events` | Optional Bearer — published upcoming |
| GET | `/api/mobile/events/map` | Optional Bearer — subculture pins (`?global=1&country=`) |
| GET | `/api/mobile/events/:id` | Optional Bearer — detail + `joined` |
| POST | `/api/mobile/events/:id/join` | Bearer — upsert participant |

Messages (`/api/mobile/messages/:roomId*`) accept **DM and FANDOM** (community member).

**Native modules:** LiveKit RN viewer (dev-client/EAS), `react-native-maps` for event pins. No in-app PSP checkout (trade = DM).

## Out of scope

APT / diorama / gem IAP — not on mobile product path.

## Scale notes

- Cursor pagination on feed/reels/comments
- Rate limits via `rateLimitPublicApi` buckets (`mobile-*`)
- Compact JSON; media via CDN URLs
