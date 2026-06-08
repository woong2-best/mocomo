import * as THREE from "three";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarConfig, AvatarPaintStroke, PaintZone } from "@/lib/virtual-avatar/types";
import { applyTextureToMaterial } from "@/lib/virtual-avatar/material-utils";

const SIZE = 512;

function getMeshes(vrm: VRM, zone: PaintZone): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  vrm.scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const n = mesh.name.toLowerCase();
    const isFace = n.includes("face") && !n.includes("hair");
    const isBody = n.includes("body") || n.includes("skin");
    if (zone === "face" && isFace) meshes.push(mesh);
    if (zone === "body" && isBody && !isFace) meshes.push(mesh);
    if (zone === "all" && (isFace || isBody)) meshes.push(mesh);
  });
  return meshes;
}

export class BodyPaintLayer {
  private faceCanvas: HTMLCanvasElement;
  private bodyCanvas: HTMLCanvasElement;
  private faceCtx: CanvasRenderingContext2D;
  private bodyCtx: CanvasRenderingContext2D;
  readonly faceTexture: THREE.CanvasTexture;
  readonly bodyTexture: THREE.CanvasTexture;
  private cacheKey = "";

  constructor() {
    this.faceCanvas = document.createElement("canvas");
    this.bodyCanvas = document.createElement("canvas");
    this.faceCanvas.width = SIZE;
    this.faceCanvas.height = SIZE;
    this.bodyCanvas.width = SIZE;
    this.bodyCanvas.height = SIZE;
    const fctx = this.faceCanvas.getContext("2d");
    const bctx = this.bodyCanvas.getContext("2d");
    if (!fctx || !bctx) throw new Error("2D context unavailable");
    this.faceCtx = fctx;
    this.bodyCtx = bctx;
    this.faceTexture = new THREE.CanvasTexture(this.faceCanvas);
    this.bodyTexture = new THREE.CanvasTexture(this.bodyCanvas);
    this.faceTexture.colorSpace = THREE.SRGBColorSpace;
    this.bodyTexture.colorSpace = THREE.SRGBColorSpace;
    this.faceTexture.flipY = false;
    this.bodyTexture.flipY = false;
  }

  applyToVrm(vrm: VRM, config: AvatarConfig) {
    if (!config.paint.enabled && config.paint.strokes.length === 0) return;

    const key = JSON.stringify(config.paint.strokes);
    if (key !== this.cacheKey) {
      this.cacheKey = key;
      this.redraw(config.paint.strokes);
      this.faceTexture.needsUpdate = true;
      this.bodyTexture.needsUpdate = true;
    }

    getMeshes(vrm, "face").forEach((mesh) => this.applyTexture(mesh, this.faceTexture));
    getMeshes(vrm, "body").forEach((mesh) => this.applyTexture(mesh, this.bodyTexture));
  }

  private redraw(strokes: AvatarPaintStroke[]) {
    this.faceCtx.clearRect(0, 0, SIZE, SIZE);
    this.bodyCtx.clearRect(0, 0, SIZE, SIZE);
    strokes.forEach((s) => {
      const ctx = s.zone === "body" ? this.bodyCtx : this.faceCtx;
      if (s.zone === "all") {
        this.drawStroke(this.faceCtx, s);
        this.drawStroke(this.bodyCtx, s);
        return;
      }
      this.drawStroke(ctx, s);
    });
  }

  private drawStroke(ctx: CanvasRenderingContext2D, s: AvatarPaintStroke) {
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.radius);
    g.addColorStop(0, this.rgba(s.color, s.opacity));
    g.addColorStop(1, this.rgba(s.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private rgba(hex: string, a: number) {
    const h = hex.replace("#", "");
    return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${a})`;
  }

  private applyTexture(mesh: THREE.Mesh, texture: THREE.CanvasTexture) {
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((mat) => applyTextureToMaterial(mat, texture, "emissive"));
  }

  dispose() {
    this.faceTexture.dispose();
    this.bodyTexture.dispose();
  }
}
