# Voice Migration: LiveKit → PeerJS P2P + Jitsi SFU

DM 1:1 calls and community voice/video use a hybrid open-source stack. **Live streaming** (`/live/*`, mobile `LiveKitViewer`) still uses LiveKit.

## Architecture

| Feature | Stack | ICE / Access |
|---------|-------|--------------|
| DM 1:1 (web + mobile) | WebRTC P2P | `GET /api/webrtc/ice-servers` or `/api/mobile/webrtc/ice-servers` |
| Community voice/video (web) | Jitsi Meet SFU | `GET /api/jitsi/community-room?channelId=` |
| Community voice/video (mobile) | Jitsi (browser / app) | `GET /api/mobile/jitsi/community-room?channelId=` |
| Live broadcast | LiveKit (unchanged) | `GET /api/livekit/token?room=` |

---

## TURN setup (P2P NAT traversal)

**Recommended:** `TURN_PROVIDER=cloudflare` — no VPS, global relay, secrets stay server-side.

Set env on **local** (`.env.local`) and **production** (Vercel / Railway — same variable names):

| Variable | Client exposure | Required |
|----------|-----------------|----------|
| `TURN_PROVIDER` | No | `cloudflare` |
| `CLOUDFLARE_TURN_KEY_ID` | No | Yes |
| `CLOUDFLARE_TURN_KEY_TOKEN` | No | Yes |
| `CLOUDFLARE_TURN_TTL_SEC` | No | Optional (default 3600) |
| `NEXT_PUBLIC_STUN_SERVERS` | Yes (fallback only) | Optional |
| `NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY` | Yes | Optional (`all` / `relay`) |

Clients fetch live TURN credentials at call start (never embed Cloudflare token in app):

- Web: `GET /api/webrtc/ice-servers`
- Mobile: `GET /api/mobile/webrtc/ice-servers`

Implementation: `src/lib/webrtc-turn/`

### Cloudflare Calls TURN (recommended)

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Realtime** → **TURN** → **Create TURN key**
2. Copy **Key ID** and **API token**
3. Local + production env:

```env
TURN_PROVIDER=cloudflare
CLOUDFLARE_TURN_KEY_ID=your-key-id
CLOUDFLARE_TURN_KEY_TOKEN=your-api-token
CLOUDFLARE_TURN_TTL_SEC=3600
```

4. **Vercel:** Settings → Environment Variables → add the four vars above → Redeploy  
5. **Railway:** Project → Variables → same names → redeploy

Verify (logged in):

```bash
curl -s -b "your-session-cookie" https://mocomo.net/api/webrtc/ice-servers | jq '.turnEnabled,.provider,.iceServers'
```

Expect `turnEnabled: true`, `provider: "cloudflare"`, and TURN URLs with `username` / `credential`.

Cloudflare returns UDP/TCP/TLS relay URLs. Port **53** URLs are filtered automatically (browser-blocked).

Pricing: free tier with Realtime SFU; otherwise ~$0.05/GB egress ([docs](https://developers.cloudflare.com/realtime/turn/)).

### Other providers (fallback)

| Value | Use case | Secrets on client? |
|-------|----------|-------------------|
| `none` | Dev / STUN only | No |
| `static` | Dev / long-term coturn password | Yes (`NEXT_PUBLIC_TURN_*`) |
| `coturn` | Self-hosted coturn | No — HMAC via API |

### Option B — coturn (self-hosted)

1. Install coturn on a VPS with public IP
2. Minimal `turnserver.conf`:

```conf
listening-port=3478
tls-listening-port=5349
alt-tls-listening-port=443
fingerprint
use-auth-secret
static-auth-secret=YOUR_TURN_SECRET
realm=mocomo.net
total-quota=100
stale-nonce=600
no-multicast-peers
```

3. Open firewall: UDP/TCP **3478**, TCP **5349**, TCP **443**, UDP **49152–65535** (relay range)
4. `.env.local`:

```env
TURN_PROVIDER=coturn
COTURN_HOST=turn.mocomo.net
TURN_SECRET=YOUR_TURN_SECRET
COTURN_TTL_SEC=86400
```

MoCoMo generates time-limited credentials: `username = expiry:userId`, `credential = HMAC-SHA1(secret, username)`.

Relay URLs (auto): UDP 3478 → TCP 3478 → TLS 5349 → TLS 443.

### Option C — static (local dev only)

Long-term username/password in env (less secure — credentials visible in client bundle):

```env
TURN_PROVIDER=static
NEXT_PUBLIC_TURN_SERVERS='[{"urls":["turn:127.0.0.1:3478?transport=udp","turn:127.0.0.1:3478?transport=tcp"],"username":"mocomo","credential":"dev-turn-pass"}]'
```

Or legacy single URL:

```env
TURN_PROVIDER=static
NEXT_PUBLIC_TURN_URL=turn:127.0.0.1:3478
TURN_USERNAME=mocomo
TURN_CREDENTIAL=dev-turn-pass
```

### Test TURN-only mode

Force all media through relay (verify TURN works):

```env
NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY=relay
```

In Chrome DevTools → `chrome://webrtc-internals` → check selected candidate pair type `relay`.

---

## Base WebRTC env (all providers)

```env
NEXT_PUBLIC_STUN_SERVERS='[{"urls":"stun:stun.l.google.com:19302"},{"urls":"stun:stun1.l.google.com:19302"}]'
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001

NEXT_PUBLIC_JITSI_DOMAIN=meet.jit.si
NEXT_PUBLIC_JITSI_ROOM_PREFIX=mocomo-

# Live broadcast only
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
NEXT_PUBLIC_LIVEKIT_URL=
```

### Community voice — do not use public meet.jit.si

Since 2023, **meet.jit.si** requires Google/GitHub login to create rooms. Embedded MoCoMo voice channels get stuck in **membersOnly lobby** (`conference.connectionError.membersOnly`).

Use **8x8 JaaS** (free tier at [jaas.8x8.vc](https://jaas.8x8.vc)) or **self-hosted Jitsi**:

```env
NEXT_PUBLIC_JITSI_DOMAIN=8x8.vc
JITSI_APP_ID=vpaas-magic-cookie-xxxxxxxx
JITSI_APP_SECRET=your-jaas-private-key
NEXT_PUBLIC_JITSI_ROOM_PREFIX=mocomo-
```

MoCoMo signs JWT server-side (`src/lib/jitsi-jwt.ts`) so members join without the Jitsi login screen.

### Mobile (Expo)

Static fallback only — live TURN creds always from API:

```env
EXPO_PUBLIC_STUN_SERVERS='[{"urls":"stun:stun.l.google.com:19302"}]'
EXPO_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## Local test checklist

1. `npm run dev`
2. Set `TURN_PROVIDER` + provider-specific vars
3. Web DM call between two networks (e.g. phone hotspot vs Wi‑Fi)
4. `chrome://webrtc-internals` — confirm `relay` candidate when NAT is strict
5. `cd apps/mobile && npm run typecheck`

---

## Key modules

| Module | Role |
|--------|------|
| `src/lib/webrtc-turn/resolve-ice-servers.ts` | Server ICE resolution |
| `src/lib/webrtc-ice-config.ts` | Web client fetch + fallback |
| `apps/mobile/src/lib/webrtc-ice-config.ts` | Mobile client fetch + fallback |
| `src/lib/peer-call/use-peer-call.ts` | Web P2P |
| `apps/mobile/src/lib/use-mobile-peer-call.ts` | Mobile P2P |

---

## Phase 2 (not started)

- Live broadcast migration off LiveKit
- Self-hosted Jitsi JWT
- TURN credential refresh mid-call (`setConfiguration`)
