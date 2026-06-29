/**
 * Sprint 2 — Persona 1 공개 화면 녹화 (7종 중 웹 가능 구간)
 * PERSONA_BASE_URL=https://mocomo.net npm run persona:record
 */
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PERSONA_BASE_URL ?? "https://mocomo.net";
const OUT = path.join("docs", "sprint2-audit", "recordings");

const SCENES = [
  { id: "01-first-launch", path: "/explore", dwellMs: 4000 },
  { id: "02-play-house-entry", path: "/play/house", dwellMs: 6000 },
  { id: "03-live-hub", path: "/live", dwellMs: 5000 },
  { id: "04-live-voice", path: "/live?mode=voice", dwellMs: 4000 },
  { id: "05-shop-deep-link", path: "/play/house?shop=official", dwellMs: 5000 },
  { id: "06-auth-signin", path: "/auth/signin", dwellMs: 3000 },
  { id: "07-notifications", path: "/notifications", dwellMs: 3000 },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const manifest = { base: BASE, capturedAt: new Date().toISOString(), recordings: [] };

  for (const scene of SCENES) {
    const videoDir = path.join(OUT, "_tmp");
    fs.mkdirSync(videoDir, { recursive: true });
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "ko-KR",
      recordVideo: { dir: videoDir, size: { width: 390, height: 844 } },
    });
    const page = await context.newPage();
    const file = `web-${scene.id}.webm`;
    const outPath = path.join(OUT, file);
    try {
      await page.goto(`${BASE}${scene.path}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(scene.dwellMs);
      const video = page.video();
      await context.close();
      if (video) {
        const tmp = await video.path();
        if (fs.existsSync(tmp)) fs.renameSync(tmp, outPath);
      }
      manifest.recordings.push({ scene: scene.id, path: scene.path, file, ok: true });
      console.log(`✓ ${scene.id}`);
    } catch (e) {
      await context.close().catch(() => {});
      manifest.recordings.push({
        scene: scene.id,
        path: scene.path,
        file,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
      console.warn(`✗ ${scene.id}`);
    }
    for (const f of fs.readdirSync(videoDir)) {
      try {
        fs.unlinkSync(path.join(videoDir, f));
      } catch {
        /* ignore */
      }
    }
  }

  fs.writeFileSync(path.join(OUT, "persona1-recordings.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  const ok = manifest.recordings.filter((r) => r.ok).length;
  console.log(`\nDone: ${ok}/${SCENES.length} → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
