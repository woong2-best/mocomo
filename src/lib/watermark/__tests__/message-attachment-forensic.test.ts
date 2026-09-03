import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 23).toString("base64");
process.env.WATERMARK_ENABLED = "true";

import type { MessageAttachmentAccessRow } from "@/lib/message-paid-media";

type TestImage = { width: number; height: number; data: Uint8ClampedArray };

/** Fan-art-like content: smooth skin tones plus fabric noise, not a test card. */
function syntheticPhoto(width: number, height: number, seed = 0x7c31): TestImage {
  const data = new Uint8ClampedArray(width * height * 4);
  let s = seed;
  const rand = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 0xffffffff;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const base =
        118 +
        42 * Math.sin((x / width) * Math.PI * 2) +
        28 * Math.cos((y / height) * Math.PI * 4) +
        rand() * 20;
      data[idx] = base;
      data[idx + 1] = base * 0.96;
      data[idx + 2] = base * 0.9;
      data[idx + 3] = 255;
    }
  }
  return { width, height, data };
}

/**
 * Mirrors what createWatermarkSession stores for a MESSAGE_ATTACHMENT session:
 * only messageAttachmentPurchaseId is set, purchaseId / episodePurchaseId /
 * subscriptionId are all null. The detector has to cope with exactly this shape.
 */
async function messageSession(opts?: { attachmentId?: string; buyer?: string }) {
  const attachmentId = opts?.attachmentId ?? "msgatt_1";
  const buyer = opts?.buyer ?? "user_buyer";
  const { buildWatermarkPayload, toBase64 } = await import("@/lib/watermark/crypto/payload");
  const { watermarkAccessRef } = await import("@/lib/watermark/access-ref");
  const { WATERMARK_TEMPORAL_PERIOD, WATERMARK_MODULATION_STRENGTH } = await import(
    "@/lib/watermark/config"
  );

  const sessionId = `session_${buyer}`;
  const sessionNonce = `nonce_${buyer}`.padEnd(32, "0");
  const sessionRow = {
    id: sessionId,
    contentId: attachmentId,
    userId: buyer,
    purchaseId: null,
    episodePurchaseId: null,
    messageAttachmentPurchaseId: `msgpurchase_${buyer}`,
    subscriptionId: null,
    sessionNonce,
    watermarkVersion: 1,
  };

  const built = buildWatermarkPayload({
    contentId: attachmentId,
    sessionId,
    userId: buyer,
    purchaseId: watermarkAccessRef(sessionRow),
    watermarkVersion: 1,
    sessionNonce,
  });

  return {
    built,
    sessionRow,
    sessionId,
    sessionNonce,
    attachmentId,
    buyer,
    config: {
      watermarkVersion: 1,
      sessionId,
      spreadSeedB64: toBase64(built.spreadSeed),
      codewordB64: toBase64(built.codeword),
      temporalPeriod: WATERMARK_TEMPORAL_PERIOD,
      modulationStrength: WATERMARK_MODULATION_STRENGTH,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Wiring: the DM attachment must reach the forensic pipeline at all.  */
/* ------------------------------------------------------------------ */

test("MESSAGE_ATTACHMENT is an accepted watermark content kind", async () => {
  const { parseWatermarkContentKind } = await import("@/lib/paid-media-playback");
  assert.equal(parseWatermarkContentKind("MESSAGE_ATTACHMENT"), "MESSAGE_ATTACHMENT");
  assert.equal(parseWatermarkContentKind("EPISODE"), "EPISODE");
  assert.equal(parseWatermarkContentKind("POST_MEDIA"), "POST_MEDIA");
  assert.equal(parseWatermarkContentKind("nonsense"), "POST_MEDIA");
  assert.equal(parseWatermarkContentKind(undefined), "POST_MEDIA");
});

test("a DM session's access reference is the message attachment purchase", async () => {
  const { watermarkAccessRef } = await import("@/lib/watermark/access-ref");

  // Regression guard: before this existed, embed used messageAttachmentPurchaseId
  // while the detector fell back to `sub:null`, so leaked DM media decoded to
  // nothing and no buyer could ever be named.
  assert.equal(
    watermarkAccessRef({
      purchaseId: null,
      episodePurchaseId: null,
      messageAttachmentPurchaseId: "msgpurchase_1",
      subscriptionId: null,
    }),
    "msgpurchase_1"
  );
  assert.equal(
    watermarkAccessRef({ purchaseId: "p1", messageAttachmentPurchaseId: "msgpurchase_1" }),
    "p1"
  );
  assert.equal(watermarkAccessRef({ subscriptionId: "sub1" }), "sub:sub1");
});

test("purchased DM media is served through the gate, never the origin url", async () => {
  const { attachMessageMediaAccess } = await import("@/lib/message-paid-media");
  const { paidMessageAttachmentPlaybackPath } = await import("@/lib/paid-media-playback");

  const attachments: MessageAttachmentAccessRow[] = [
    { id: "a_img", url: "https://cdn.example/fanart.jpg", type: "IMAGE", priceKrw: 3000 },
    { id: "a_vid", url: "https://cdn.example/fanart.mp4", type: "VIDEO", priceKrw: 5000 },
    { id: "a_free", url: "https://cdn.example/free.jpg", type: "IMAGE", priceKrw: 0 },
  ];
  const out = attachMessageMediaAccess(
    { senderId: "seller", attachments },
    "buyer",
    new Set(["a_img", "a_vid"])
  );

  assert.equal(out.attachments![0].url, paidMessageAttachmentPlaybackPath("a_img"));
  assert.equal(out.attachments![0].locked, false);
  assert.equal(out.attachments![1].url, paidMessageAttachmentPlaybackPath("a_vid"));
  assert.equal(out.attachments![2].url, "https://cdn.example/free.jpg");

  for (const a of out.attachments!) {
    assert.ok(!a.url.startsWith("https://cdn.example/fanart"), "origin url leaked to buyer");
  }
});

test("unpurchased DM media leaks neither the origin url nor a preview", async () => {
  const { attachMessageMediaAccess } = await import("@/lib/message-paid-media");

  const attachments: MessageAttachmentAccessRow[] = [
    { id: "a_img", url: "https://cdn.example/fanart.jpg", type: "IMAGE", priceKrw: 3000 },
  ];
  const out = attachMessageMediaAccess({ senderId: "seller", attachments }, "buyer", new Set());

  assert.equal(out.attachments![0].locked, true);
  assert.equal(out.attachments![0].url, "");
});

test("the sender also streams through the gate so the origin url never renders", async () => {
  const { attachMessageMediaAccess } = await import("@/lib/message-paid-media");
  const { paidMessageAttachmentPlaybackPath } = await import("@/lib/paid-media-playback");

  const attachments: MessageAttachmentAccessRow[] = [
    { id: "a_img", url: "https://cdn.example/fanart.jpg", type: "IMAGE", priceKrw: 3000 },
  ];
  const out = attachMessageMediaAccess({ senderId: "seller", attachments }, "seller", new Set());

  assert.equal(out.attachments![0].locked, false);
  assert.equal(out.attachments![0].url, paidMessageAttachmentPlaybackPath("a_img"));
});

test("only media types the forensic pipeline can carry may be priced", async () => {
  const { sanitizeChatAttachments } = await import("@/lib/chat-attachments");

  const out = sanitizeChatAttachments([
    { url: "https://cdn.example/a.jpg", type: "IMAGE", priceKrw: 1000 },
    { url: "https://cdn.example/a.mp4", type: "VIDEO", priceKrw: 1000 },
    { url: "https://cdn.example/a.gif", type: "GIF", priceKrw: 1000 },
    { url: "https://cdn.example/a.m4a", type: "AUDIO", priceKrw: 1000 },
    { url: "https://cdn.example/a.zip", type: "FILE", priceKrw: 1000 },
    { url: "https://cdn.example/free.gif", type: "GIF" },
  ]);

  assert.deepEqual(
    out.map((a) => a.type),
    ["IMAGE", "VIDEO", "GIF"]
  );
  assert.equal(out[2].priceKrw, undefined, "free GIF stays free rather than becoming sellable");
});

test("a relayed message never carries a paid attachment url", async () => {
  const { attachMessageMediaAccess } = await import("@/lib/message-paid-media");
  // Socket relay and any viewer-less serialization must fail closed.
  const attachments: MessageAttachmentAccessRow[] = [
    { id: "a_img", url: "https://cdn.example/fanart.jpg", type: "IMAGE", priceKrw: 3000 },
  ];
  const out = attachMessageMediaAccess({ senderId: "seller", attachments }, null, new Set());
  assert.equal(out.attachments![0].url, "");
  assert.equal(out.attachments![0].locked, true);
});

/* ------------------------------------------------------------------ */
/* The signal: it has to survive at the sizes a DM bubble actually is. */
/* ------------------------------------------------------------------ */

/** Sizes the paid DM card actually paints at, CSS px × devicePixelRatio. */
const DM_TILE_SIZES: Array<[string, number, number]> = [
  ["web paid card @1x", 280, 380],
  ["web paid card @2x", 560, 760],
  ["web paid card, 320px viewport @1x", 230, 380],
  ["mobile webview paid card @1x", 240, 380],
  ["mobile webview paid card @2x", 480, 760],
  ["mobile webview paid card, narrow phone", 230, 380],
];

for (const [label, w, h] of DM_TILE_SIZES) {
  test(`DM ${label} (${w}x${h}) embeds and passes canonical verify`, async () => {
    const { isForensicEmbedSizeReady } = await import("@/components/media/forensic-canvas-fit");
    const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
    const { verifyWatermarkFrame } = await import("@/lib/watermark/verify-watermark-frame");
    const { toBase64 } = await import("@/lib/watermark/crypto/payload");
    const { built, config, attachmentId } = await messageSession();

    assert.equal(
      isForensicEmbedSizeReady({
        cssWidth: w,
        cssHeight: h,
        width: w,
        height: h,
        devicePixelRatio: 1,
      }),
      true,
      `${w}x${h} is below the forensic embed floor — the canvas would never render`
    );

    const frame = syntheticPhoto(w, h);
    embedInvisibleWatermark(frame, config, 0);

    const result = verifyWatermarkFrame({
      frame,
      renderConfig: config,
      opaqueWatermarkId: built.opaqueWatermarkId,
      contentId: attachmentId,
      expectedIntegrityB64: toBase64(built.core.integrity),
      phase: 0,
    });

    assert.equal(
      result.finalPass,
      true,
      `${label} → ${result.status} ecc=${result.eccValid} integrity=${result.integrityValid}`
    );
    assert.equal(result.status, "MATCH");
  });
}

test("paid DM media stays visually imperceptible on a flat fan-art background", async () => {
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { config } = await messageSession();

  const w = 280;
  const h = 380;
  const before = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < before.length; i += 4) {
    before[i] = 232;
    before[i + 1] = 228;
    before[i + 2] = 220;
    before[i + 3] = 255;
  }
  const after = new Uint8ClampedArray(before);
  embedInvisibleWatermark({ width: w, height: h, data: after }, config, 0);

  let maxDelta = 0;
  for (let i = 0; i < before.length; i += 4) {
    const la = before[i] * 0.299 + before[i + 1] * 0.587 + before[i + 2] * 0.114;
    const lb = after[i] * 0.299 + after[i + 1] * 0.587 + after[i + 2] * 0.114;
    maxDelta = Math.max(maxDelta, Math.abs(la - lb));
  }
  assert.ok(maxDelta <= 2.5, `flat field maxΔ=${maxDelta.toFixed(2)} exceeds invisibility gate`);
});

/* ------------------------------------------------------------------ */
/* Attribution: a leaked screenshot must name the buyer, and only them. */
/* ------------------------------------------------------------------ */

test("a screenshot of leaked DM fan-art is attributed to the buyer who leaked it", async () => {
  const { embedInvisibleWatermark } = await import("@/lib/watermark/encoder/spread-spectrum");
  const { detectWatermarkInFrames, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { decodeCaptureFramesFast } = await import("@/lib/watermark/decoder/capture-frames");
  const sharp = (await import("sharp")).default;

  const leaker = await messageSession({ buyer: "user_leaker" });
  const innocent = await messageSession({ buyer: "user_innocent" });

  const display = syntheticPhoto(560, 760);
  embedInvisibleWatermark(display, leaker.config, 0);

  // Same trip a leak takes: canvas → OS screenshot → PNG on a forum.
  const png = await sharp(Buffer.from(display.data), {
    raw: { width: display.width, height: display.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const frames = await decodeCaptureFramesFast(png);

  // Candidates are built straight from the stored session row, exactly as the
  // admin detector does — no hand-fed access reference.
  const candidates = [leaker, innocent].map(
    (s) =>
      prepareCandidate({
        ...s.sessionRow,
        opaqueWatermarkId: s.built.opaqueWatermarkId,
      }).candidate
  );

  const result = detectWatermarkInFrames(frames, candidates, { fast: true });

  assert.equal(result.status, "MATCH");
  assert.equal(result.integrityValid, true);
  assert.equal(result.eccValid, true);
  assert.equal(result.sessionId, leaker.sessionId);
  assert.equal(result.contentId, leaker.attachmentId);
  assert.notEqual(result.sessionId, innocent.sessionId);
});

test("a clean DM screenshot is not pinned on any buyer", async () => {
  const { detectWatermarkInFrames, prepareCandidate } = await import(
    "@/lib/watermark/decoder/pipeline"
  );
  const { decodeCaptureFramesFast } = await import("@/lib/watermark/decoder/capture-frames");
  const sharp = (await import("sharp")).default;

  const buyer = await messageSession({ buyer: "user_clean" });
  const display = syntheticPhoto(560, 760, 0x2244);

  const png = await sharp(Buffer.from(display.data), {
    raw: { width: display.width, height: display.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const frames = await decodeCaptureFramesFast(png);
  const result = detectWatermarkInFrames(
    frames,
    [
      prepareCandidate({
        ...buyer.sessionRow,
        opaqueWatermarkId: buyer.built.opaqueWatermarkId,
      }).candidate,
    ],
    { fast: true }
  );

  assert.notEqual(result.status, "MATCH");
  assert.equal(result.integrityValid, false);
});
