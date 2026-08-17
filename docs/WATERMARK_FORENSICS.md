# Forensic Watermarking (web, paid video)

Marks paid video playback with an invisible, per-viewing-session signal so a
leaked screen capture can be traced back to the session it came from.

Web primary; mobile app reuses the same forensic renderer via an authenticated
embed WebView when `WATERMARK_ENABLED` is on.

## What it does and does not do

It marks **what the protected player renders**. A capture of the player — a
screenshot, a screen recording, a phone pointed at the monitor — carries the
signal.

It does **not** mark the stored file. Anyone who reached the underlying media URL
used to get clean bytes. Paid video playback on the web now goes through
`/api/media/paid/[id]` (or `/api/media/paid/episode/[id]`), which checks
entitlement on every request and never puts the origin URL in the page. The
stored object is still unmarked; the gate is what stops casual download.

A detection result says a capture carries signals matching a viewing session. It
does not establish who leaked it — the account holder may have been recorded,
shared a screen, or had their device compromised. Treat it as an investigative
lead.

## Configuration

| Variable | Default | Notes |
|---|---|---|
| `WATERMARK_ENABLED` | off | `1`/`true`/`yes` turns playback marking on |
| `WATERMARK_MASTER_SECRET` | — | Required. Base64 or hex, 32+ bytes. Rotating it makes every earlier session undetectable |
| `WATERMARK_VERSION` | `1` | Bump alongside a carrier change so old sessions stay decodable |

The feature stays off until `WATERMARK_ENABLED` is set, and the session endpoint
returns 503 if the secret is missing.

Distinct from the visible credit watermark applied at compose time
(`src/lib/media-watermark.ts`). That one is branding, this one is forensic; they
do not interact.

## Surface

| Endpoint | Access |
|---|---|
| `GET /api/watermark/config` | public flags |
| `POST /api/watermark/session` | authenticated, paid video, entitlement required |
| `GET /api/media/paid/[id]` | authenticated, paid PostMedia video bytes |
| `GET /api/media/paid/episode/[id]` | authenticated, paid creator-episode video bytes |
| `POST /api/admin/watermark/detect` | admin, audited, returns a job id |
| `GET /api/admin/watermark/detect/[jobId]` | admin, poll job result |
| `GET /api/admin/watermark/sessions` | admin session list |

Admin UI lives at `/admin/watermark/forensics`. Detection reports one of
`MATCH`, `POSSIBLE_MATCH`, `INCONCLUSIVE` or `NOT_DETECTED`.

## How a session works

1. The player requests `POST /api/watermark/session` for a paid video.
2. The server confirms the viewer is actually entitled to that media — a
   `PostMediaPurchase`, an active subscription, or a `CreatorEpisodePurchase` —
   then creates a `WatermarkSession` and derives an opaque id from the master secret over
   (user, content, entitlement, nonce). No viewer identity travels to the client.
   The author is exempt: they are the rights holder, not a leak suspect.
   Paid web playback uses `/api/media/paid/...` so the origin CDN URL is not in the document.
3. The client receives a carrier: a spreading seed plus a Reed-Solomon codeword
   carrying content, session, nonce and an HMAC integrity tag.
4. `ForensicVideoCanvas` draws playback through a canvas and modulates the
   regions for each frame.

Sessions expire after 4 hours. Expired sessions stay in the table because
detection needs them.

## Where the signal is applied

Every surface that plays a sale-priced video has to carry the mark, or the
easiest capture path is also the unwatermarked one. Currently that means
`ProtectedPaidMedia` (inline feed, post detail, profile grid, expand lightbox,
creator-episode viewer) and `ReelsPlayer` (reels and the feed's full-screen
viewer). Both take the media price and open a session from it. Episode playback
sends `contentKind: "EPISODE"` so the session is bound to the episode purchase,
not a PostMedia row.

Playback compositing uses WebGL when the browser can create a context, and
falls back to a 2D canvas. Either way the displayed pixels are the marked
frame; the hidden `<video>` is not what the user (or a screen recorder) sees.

When adding a new video surface, pass the price through. A player that only
receives `mediaId` renders unprotected, and nothing will fail loudly.

## How the signal is carried

Each bit is embedded as opposing luminance shifts across horizontally adjacent
pixel pairs. Pairing cancels local gradients, so the difference survives content
that a plain brightness offset would drown in.

Two constraints shape everything else:

- **Bits must not share pixels.** Overlapping bits cancel and nothing decodes.
  Each bit gets a disjoint set of pairs, and the count per bit is capped by how
  many pairs the region actually holds.
- **Regions must not overlap.** Anchors sit in the ring outside the central box
  for the same reason.

The codeword is repeated in four central quadrants and in ring anchors, each
XOR-masked differently. Any one copy is enough to recover the whole payload, so
a crop, a logo or a black bar over part of the frame is survivable.

## Investigating a leak

Admin → Watermark Forensics.

Supply the **media id** when you have it. Each session has its own carrier, so
the detector has to try candidate sessions; scoping to the leaked content limits
that to the people who bought it. Without an id, only recent sessions across all
content are searched, and an older leak can be missed.

Video is decoded in the admin's browser and sampled frames are uploaded — this
runtime has no video decoder. POST `/api/admin/watermark/detect` returns a job
id immediately; analysis runs after the response and the UI polls
`GET /api/admin/watermark/detect/[jobId]`. The audit log records the hash of the
frames that were actually analysed, with the client-reported hash of the original
file kept alongside it as unverified metadata. The upload itself is not stored.

A `MATCH` requires the Reed-Solomon decode to succeed *and* the HMAC integrity
tag to verify against that session's opaque id. Anything weaker is reported as
possible or inconclusive rather than attributed.

## Measured degradation (synthetic)

`npm run test:watermark` includes JPEG q70, a 50% downscale/upscale round trip,
and an 8% center crop on a 960×540 synthetic frame. JPEG at q70 is expected to
stay MATCH or POSSIBLE_MATCH. Strong scaling and crop can fall through to
INCONCLUSIVE or NOT_DETECTED — that is the documented limit, not a test failure.

These are not screen-recording samples. A phone pointed at a monitor, or a
heavy re-encode, can still destroy the carrier.

## Limits worth knowing

- Heavy re-encoding, strong scaling or a low-quality re-record can destroy the
  signal. Detection failing does not mean the capture was clean.
- Detection cost grows with the number of candidate sessions. A short probe
  rejects most candidates cheaply, but a blind search across all content is
  still best effort.
- The carrier is per session, so a viewer who inspects their own session cannot
  learn anything about another viewer's copy.

## Tests

```bash
npm run test:watermark
```

Covers the pixel round trip, recovery after noise and the loss of a whole
quadrant, refusal to attribute a clean or unrelated frame, per-frame embedding
cost, and Reed-Solomon behaviour.
