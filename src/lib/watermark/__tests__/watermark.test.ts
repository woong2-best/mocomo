import test from "node:test";
import assert from "node:assert/strict";

process.env.WATERMARK_MASTER_SECRET = Buffer.alloc(32, 7).toString("base64");
process.env.WATERMARK_ENABLED = "true";

test("watermark core", async () => {
  const {
    encodeWatermarkPayload,
    decodeWatermarkCodeword,
    validateDecodedPayload,
  } = await import("@/lib/watermark/crypto/payload");
  const { rsEncode, rsDecode, corruptByte } = await import(
    "@/lib/watermark/error-correction/reed-solomon"
  );
  const { mergeQuadrantStreams, splitCodewordToQuadrants } = await import(
    "@/lib/watermark/encoder/quadrant-encode"
  );
  const { WATERMARK_PARITY_BYTES } = await import("@/lib/watermark/config");

  const encoded = encodeWatermarkPayload({
    contentId: "media_test_1",
    sessionId: "session_test_1",
    userId: "user_test_1",
    purchaseId: "purchase_test_1",
    watermarkVersion: 1,
  });

  const decoded = decodeWatermarkCodeword(encoded.codeword);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.eccValid, true);
  assert.ok(decoded.core);
  assert.equal(
    validateDecodedPayload(decoded.core!, encoded.opaqueWatermarkId),
    true
  );

  const msg = new Uint8Array(32).map((_, i) => i + 1);
  const codeword = rsEncode(msg, WATERMARK_PARITY_BYTES);
  const corrupted = corruptByte(codeword, 10);
  const rsDecoded = rsDecode(corrupted, WATERMARK_PARITY_BYTES);
  assert.equal(rsDecoded.ok, true);
  assert.deepEqual(rsDecoded.data, msg);

  const parts = splitCodewordToQuadrants(codeword);
  const merged = mergeQuadrantStreams(
    { A: null, B: parts.B, C: parts.C, D: parts.D },
    { B: 1, C: 1, D: 1 }
  );
  const mergedDecoded = rsDecode(merged, WATERMARK_PARITY_BYTES);
  assert.equal(mergedDecoded.ok, true);

  const scenarios: Array<Partial<Record<"A" | "B" | "C" | "D", boolean>>> = [
    { A: true, B: true, C: true, D: true },
    { A: false, B: true, C: true, D: true },
    { A: true, B: false, C: true, D: true },
    { A: true, B: true, C: false, D: true },
    { A: true, B: true, C: true, D: false },
  ];

  const sample = rsEncode(new Uint8Array(32).map((_, i) => (i * 3) & 0xff), WATERMARK_PARITY_BYTES);
  const sampleParts = splitCodewordToQuadrants(sample);

  for (const scenario of scenarios) {
    const mergedScenario = mergeQuadrantStreams(
      {
        A: scenario.A === false ? null : sampleParts.A,
        B: scenario.B === false ? null : sampleParts.B,
        C: scenario.C === false ? null : sampleParts.C,
        D: scenario.D === false ? null : sampleParts.D,
      },
      { A: 1, B: 1, C: 1, D: 1 }
    );
    const scenarioDecoded = rsDecode(mergedScenario, WATERMARK_PARITY_BYTES);
    assert.equal(scenarioDecoded.ok, true, JSON.stringify(scenario));
  }
});
