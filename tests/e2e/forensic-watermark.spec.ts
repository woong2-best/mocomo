/**
 * TEST B / TEST C scaffold — requires authenticated purchase session.
 *
 * Run (after setting env):
 *   PERSONA_SESSION_COOKIE="authjs.session-token=..." \
 *   FORENSIC_E2E_MEDIA_ID="..." \
 *   npx playwright test tests/e2e/forensic-watermark.spec.ts
 *
 * Without env vars tests are skipped (NOT VERIFIED).
 */

import { test, expect } from "@playwright/test";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);

const BASE = process.env.FORENSIC_E2E_BASE_URL ?? process.env.PERSONA_BASE_URL ?? "https://mocomo.net";
const COOKIE_RAW = process.env.PERSONA_SESSION_COOKIE?.trim();
const MEDIA_ID = process.env.FORENSIC_E2E_MEDIA_ID?.trim();
const POST_ID = process.env.FORENSIC_E2E_POST_ID?.trim();

function parseCookie(raw: string, baseUrl: string) {
  const host = new URL(baseUrl).hostname;
  const secure = baseUrl.startsWith("https");
  if (raw.includes("=")) {
    const eq = raw.indexOf("=");
    return {
      name: raw.slice(0, eq).trim(),
      value: raw.slice(eq + 1).trim(),
      domain: host,
      path: "/",
      secure,
      httpOnly: true,
      sameSite: "Lax" as const,
    };
  }
  return {
    name: secure ? "__Secure-authjs.session-token" : "authjs.session-token",
    value: raw,
    domain: host,
    path: "/",
    secure,
    httpOnly: true,
    sameSite: "Lax" as const,
  };
}

async function runDetector(png: Buffer, mediaId: string, sessionId?: string) {
  process.env.WATERMARK_MASTER_SECRET =
    process.env.WATERMARK_MASTER_SECRET ?? Buffer.alloc(32, 17).toString("base64");
  process.env.WATERMARK_ENABLED = "true";

  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frame = {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };

  const { loadDetectionCandidates, prepareCandidate, detectWatermarkInFrame } = await import(
    "@/lib/watermark/decoder/pipeline"
  );

  const candidates = await loadDetectionCandidates({
    contentId: mediaId,
    sessionId: sessionId ?? null,
    limit: 50,
  });
  const prepared = candidates.map((c) => prepareCandidate(c));
  return detectWatermarkInFrame(frame, prepared, true);
}

test.describe("forensic watermark browser E2E", () => {
  test.skip(!COOKIE_RAW || !MEDIA_ID, "Requires PERSONA_SESSION_COOKIE and FORENSIC_E2E_MEDIA_ID");

  test("TEST B — real canvas toBlob → detector", async ({ browser }) => {
    const context = await browser.newContext();
    await context.addCookies([parseCookie(COOKIE_RAW!, BASE)]);
    const page = await context.newPage();

    await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded", timeout: 60_000 });

    // Open lightbox via global hook if post id known; otherwise rely on manual feed interaction stub.
    if (POST_ID) {
      await page.goto(`${BASE}/post/${POST_ID}`, { waitUntil: "domcontentloaded" });
    }

    await page.waitForFunction(
      () => {
        const s = window.__mocomoForensicDebug?.status?.();
        return s && (s.readyCount > 0 || s.currentStage === "FAILED");
      },
      { timeout: 20_000 }
    );

    const status = await page.evaluate(() => window.__mocomoForensicDebug?.status?.());
    console.info("[TEST B] forensic status", JSON.stringify(status, null, 2));

    const pngBase64 = await page.evaluate(async () => {
      const canvas = document.querySelector<HTMLCanvasElement>("canvas[data-forensic-canvas='ready']");
      if (!canvas) throw new Error("No ready forensic canvas");
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("toBlob failed");
      const buf = await blob.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    const png = Buffer.from(pngBase64, "base64");
    const sessionId = status?.session?.sessionId ?? undefined;
    const result = await runDetector(png, MEDIA_ID!, sessionId);

    console.info("[TEST B] detector", result.status, result.sessionId, {
      ecc: result.eccValid,
      integrity: result.integrityValid,
    });

    expect(result.status).toBe("MATCH");
    expect(result.eccValid).toBe(true);
    expect(result.integrityValid).toBe(true);
    if (sessionId) expect(result.sessionId).toBe(sessionId);

    await context.close();
  });

  test("TEST C — page.screenshot → detector", async ({ browser }) => {
    const context = await browser.newContext({ deviceScaleFactor: 1 });
    await context.addCookies([parseCookie(COOKIE_RAW!, BASE)]);
    const page = await context.newPage();

    await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    if (POST_ID) {
      await page.goto(`${BASE}/post/${POST_ID}`, { waitUntil: "domcontentloaded" });
    }

    await page.waitForFunction(
      () => window.__mocomoForensicDebug?.status?.()?.readyCount === 1,
      { timeout: 20_000 }
    );

    const outDir = path.join(process.cwd(), "tests", "e2e", "output");
    fs.mkdirSync(outDir, { recursive: true });
    const shotPath = path.join(outDir, "forensic-page-screenshot.png");
    await page.screenshot({ path: shotPath, fullPage: false });

    const png = fs.readFileSync(shotPath);
    const status = await page.evaluate(() => window.__mocomoForensicDebug?.status?.());
    const result = await runDetector(png, MEDIA_ID!, status?.session?.sessionId ?? undefined);

    console.info("[TEST C] detector", result.status, {
      ecc: result.eccValid,
      integrity: result.integrityValid,
      central: result.centralScore,
    });

    expect(result.status).toBe("MATCH");
    expect(result.integrityValid).toBe(true);
    expect(result.eccValid).toBe(true);

    await context.close();
  });
});
