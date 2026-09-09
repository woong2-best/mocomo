/** MapLibre GL JS dynamic import + worker URL (required for Next.js / Turbopack). */

let workerUrlConfigured = false;

export async function loadMapLibre() {
  const mod = await import("maplibre-gl");
  await import("maplibre-gl/dist/maplibre-gl.css");
  const api = (mod as { default?: typeof mod }).default ?? mod;

  if (
    !workerUrlConfigured &&
    typeof (api as { setWorkerUrl?: (url: string) => void }).setWorkerUrl === "function"
  ) {
    const workerPath = "/maplibre/maplibre-gl-worker.mjs";
    const workerUrl =
      typeof window !== "undefined"
        ? new URL(workerPath, window.location.origin).href
        : workerPath;
    (api as { setWorkerUrl: (url: string) => void }).setWorkerUrl(workerUrl);
    workerUrlConfigured = true;
  }

  if (typeof (api as { Map?: unknown }).Map !== "function") {
    throw new Error("MapLibre Map constructor missing");
  }

  return api as typeof import("maplibre-gl");
}
