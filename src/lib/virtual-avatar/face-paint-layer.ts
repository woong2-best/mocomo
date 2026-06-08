import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarConfig } from "@/lib/virtual-avatar/types";
import { applyTextureToMaterial } from "@/lib/virtual-avatar/material-utils";
import { LIP_COLORS, SKIN_TONES, adjustSkinColor } from "@/lib/virtual-avatar/presets";

const SIZE = 512;

function getFaceMesh(vrm: VRM): THREE.Mesh | null {
  let found: THREE.Mesh | null = null;
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (found || !mesh.isMesh) return;
    const n = mesh.name.toLowerCase();
    if (n.includes("face") && !n.includes("hair")) found = mesh;
  });
  return found;
}

/** VRM 얼굴 UV 대략 좌표 — 캔버스에 메이크업 레이어를 그림 */
export class FacePaintLayer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  private cacheKey = "";

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = SIZE;
    this.canvas.height = SIZE;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.flipY = false;
  }

  applyToVrm(vrm: VRM, config: AvatarConfig) {
    const mesh = getFaceMesh(vrm);
    if (!mesh) return;

    const key = JSON.stringify({
      m: config.face.makeup,
      s: config.skin,
      lip: config.face.makeup.lipColorIndex,
    });
    if (key !== this.cacheKey) {
      this.cacheKey = key;
      this.paint(config);
      this.texture.needsUpdate = true;
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => {
      applyTextureToMaterial(mat, this.texture, "emissive");
      const m = config.face.makeup;
      if ("emissiveIntensity" in mat) {
        (mat as THREE.MeshStandardMaterial).emissiveIntensity =
          0.22 + (m.lipstick + m.blushIntensity + m.eyeshadow) / 420;
      }
    });
  }

  private paint(config: AvatarConfig) {
    const { face, skin } = config;
    const m = face.makeup;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const skinHex = SKIN_TONES[skin.toneIndex]?.hex ?? SKIN_TONES[2].hex;
    const base = adjustSkinColor(skinHex, skin.brightness, skin.saturation);
    const lipHex = LIP_COLORS[m.lipColorIndex]?.hex ?? "#e879a0";

    if (skin.freckles) {
      ctx.fillStyle = "rgba(120,80,50,0.35)";
      for (let i = 0; i < 48; i++) {
        const x = 140 + Math.random() * 232;
        const y = 180 + Math.random() * 160;
        const r = 0.6 + Math.random() * 1.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const blushA = (m.blushIntensity / 100) * (skin.blush ? 0.55 : 0.35);
    if (blushA > 0.02) {
      this.radial(ctx, 168, 268, 72, `rgba(255,120,140,${blushA})`);
      this.radial(ctx, 344, 268, 72, `rgba(255,120,140,${blushA})`);
    }

    const shadowA = (m.contour / 100) * 0.45;
    if (shadowA > 0.02) {
      this.radial(ctx, 128, 300, 56, `rgba(60,30,40,${shadowA})`);
      this.radial(ctx, 384, 300, 56, `rgba(60,30,40,${shadowA})`);
      this.radial(ctx, 256, 340, 48, `rgba(50,25,35,${shadowA * 0.7})`);
    }

    const hiA = (m.highlight / 100) * 0.5;
    if (hiA > 0.02) {
      this.radial(ctx, 256, 200, 36, `rgba(255,255,255,${hiA})`);
      this.radial(ctx, 256, 248, 22, `rgba(255,250,240,${hiA * 0.8})`);
    }

    const eyeA = (m.eyeshadow / 100) * 0.55;
    if (eyeA > 0.02) {
      ctx.fillStyle = `rgba(120,80,160,${eyeA})`;
      ctx.beginPath();
      ctx.ellipse(188, 228, 38, 22, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(324, 228, 38, 22, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }

    const linerA = (m.eyeliner / 100) * 0.65;
    if (linerA > 0.02) {
      ctx.strokeStyle = `rgba(20,10,30,${linerA})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(188, 232, 34, 18, -0.08, 0.2, Math.PI - 0.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(324, 232, 34, 18, 0.08, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }

    const lipA = (m.lipstick / 100) * 0.75;
    if (lipA > 0.02) {
      this.radial(ctx, 256, 318, 42, this.hexAlpha(lipHex, lipA));
      ctx.fillStyle = this.hexAlpha(lipHex, lipA * 0.85);
      ctx.beginPath();
      ctx.ellipse(256, 308, 28, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (skin.glow) {
      this.radial(ctx, 256, 260, 120, `rgba(${this.hexRgb(base)},0.08)`);
    }
  }

  private radial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  private hexAlpha(hex: string, a: number) {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  private hexRgb(hex: string) {
    const h = hex.replace("#", "");
    return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
  }

  dispose() {
    this.texture.dispose();
  }
}
