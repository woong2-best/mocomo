/**
 * Bondee renderer + fog — RC-A A-2
 */
import * as THREE from "three";
import { BONDEE_LIGHTING } from "./bondee-lighting-bible";
import { BONDEE_COLORS } from "./bondee-color-bible";

export function applyBondeeRenderer(gl: THREE.WebGLRenderer): void {
  gl.outputColorSpace = THREE.SRGBColorSpace;
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = BONDEE_LIGHTING.renderer.toneMappingExposure;
  gl.shadowMap.enabled = true;
  gl.shadowMap.type = THREE.PCFSoftShadowMap;
}

export function bondeeFogArgs(): [string, number, number] {
  const L = BONDEE_LIGHTING.fog;
  return [L.colorHex, L.near, L.far];
}

export function bondeeBackgroundHex(): string {
  return BONDEE_COLORS.fogCream;
}

export function shouldEnableBondeePostFx(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("bondeeFx") === "1") return true;
  return false;
}
