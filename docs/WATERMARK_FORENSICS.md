# MoCoMo Forensic Watermark (WEB)

Paid **video** playback only. Free posts and mobile app are out of scope for this phase.

## Architecture

```
Purchase verified (server)
  → WatermarkSession (DB)
  → Opaque payload + Reed-Solomon codeword
  → Canvas compositor (invisible luminance modulation)
  → Central 4-part + distributed + temporal layers

Leaked image/video upload (admin)
  → Frame sampling
  → Spatial extraction + ECC + HMAC integrity
  → Session lookup → purchase → member (admin only)
```

## Environment

| Variable | Description |
|----------|-------------|
| `WATERMARK_ENABLED` | `false` by default in production |
| `WATERMARK_VERSION` | Protocol version integer |
| `WATERMARK_MASTER_SECRET` | Server HMAC key (32+ bytes) |

## API

- `GET /api/watermark/config` — public flags
- `POST /api/watermark/session` — authenticated, paid video only
- `POST /api/admin/watermark/detect` — admin forensic upload
- `GET /api/admin/watermark/sessions` — admin session list

## Admin UI

`/admin/watermark/forensics` — upload JPG/PNG/WEBP/MP4/MOV/WEBM

Detection statuses: `MATCH`, `POSSIBLE_MATCH`, `INCONCLUSIVE`, `NOT_DETECTED`

## Limitations (by design)

- Not 100% against re-shoot, heavy blur, or AI transforms
- Single-frame screenshot detection depends on quality and coverage
- Video detection samples frames (not every frame)
- Does not replace visible compose credit watermarks (`media-watermark.ts`)

## Tests

```bash
npm run test:watermark
```
