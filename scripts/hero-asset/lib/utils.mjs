import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadAssetConfig(assetId) {
  const p = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "assets", `${assetId}.json`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function heroAssetDir(assetId, version) {
  return path.join(ROOT, "public/apt/hero-assets", assetId, `v${version}`);
}

export function heroGlbPath(assetId, version) {
  return path.join(ROOT, "public/apt/glb/hero-assets", `${assetId}-v${version}.glb`);
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

export function getByPath(obj, dotPath) {
  return dotPath.split(".").reduce((o, k) => o?.[k], obj);
}

export function scoreMeasure(model, target, tolerance) {
  if (typeof target === "object" && target !== null && !Array.isArray(target)) {
    return null;
  }
  if (typeof target === "number") {
    if (!target) return model === target ? 100 : 0;
    const err = Math.abs(model - target) / target;
    const tol = tolerance / target;
    if (err <= tol) return 100;
    return Math.max(0, 100 * (1 - (err - tol) / (1 - tol)));
  }
  return model === target ? 100 : 0;
}

export const CAMERA = {
  elevationDeg: 35,
  azimuthDeg: 45,
};

export const OUTLINE_COLOR = {
  reference: { r: 255, g: 80, b: 80 },
  model: { r: 80, g: 160, b: 255 },
  match: { r: 240, g: 240, b: 240 },
  refOnly: { r: 255, g: 60, b: 60 },
  modelOnly: { r: 60, g: 120, b: 255 },
};
