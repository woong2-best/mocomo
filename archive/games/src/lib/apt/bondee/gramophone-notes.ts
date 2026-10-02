"use client";

import * as THREE from "three";

const NOTE_CHARS = ["♩", "♪", "♫", "♬", "🎵", "🎶"] as const;
const SPAWN_INTERVAL = 0.38;
const NOTE_LIFE = 2.2;

type FloatingNote = {
  sprite: THREE.Sprite;
  age: number;
  vy: number;
  vx: number;
  wobble: number;
};

function emojiTexture(emoji: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 128, 128);
  ctx.font = "72px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 64, 68);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Musical-note sprites that float from the gramophone horn while music plays. */
export class GramophoneNoteFx {
  private root = new THREE.Group();
  private notes: FloatingNote[] = [];
  private textures = new Map<string, THREE.CanvasTexture>();
  private spawnTimer = 0;
  private readonly tmp = new THREE.Vector3();

  constructor(parent: THREE.Object3D) {
    parent.add(this.root);
  }

  tick(dt: number, playing: boolean, emitters: THREE.Vector3[]): boolean {
    if (playing && emitters.length > 0) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= SPAWN_INTERVAL) {
        this.spawnTimer = 0;
        const src = emitters[Math.floor(Math.random() * emitters.length)];
        const emoji = NOTE_CHARS[Math.floor(Math.random() * NOTE_CHARS.length)];
        this.spawn(src, emoji);
      }
    }

    let alive = false;
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.age += dt;
      if (n.age >= NOTE_LIFE) {
        this.disposeNote(n);
        this.notes.splice(i, 1);
        continue;
      }
      alive = true;
      const t = n.age / NOTE_LIFE;
      const fade = t < 0.15 ? t / 0.15 : t > 0.72 ? (1 - t) / 0.28 : 1;
      n.sprite.position.y += n.vy * dt;
      n.sprite.position.x += n.vx * dt + Math.sin(n.age * 4 + n.wobble) * 0.08 * dt;
      n.sprite.position.z += Math.cos(n.age * 3.2 + n.wobble) * 0.05 * dt;
      const mat = n.sprite.material as THREE.SpriteMaterial;
      mat.opacity = fade * 0.95;
      const scale = 0.22 + Math.sin(n.age * 5) * 0.03;
      n.sprite.scale.setScalar(scale);
    }
    return alive || this.notes.length > 0;
  }

  private spawn(worldPos: THREE.Vector3, emoji: string) {
    let tex = this.textures.get(emoji);
    if (!tex) {
      tex = emojiTexture(emoji);
      this.textures.set(emoji, tex);
    }
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.copy(worldPos);
    sprite.scale.setScalar(0.18);
    this.root.add(sprite);
    this.notes.push({
      sprite,
      age: 0,
      vy: 0.28 + Math.random() * 0.14,
      vx: (Math.random() - 0.5) * 0.12,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  private disposeNote(n: FloatingNote) {
    this.root.remove(n.sprite);
    const mat = n.sprite.material as THREE.SpriteMaterial;
    mat.map = null;
    mat.dispose();
  }

  dispose() {
    for (const n of this.notes) this.disposeNote(n);
    this.notes = [];
    for (const tex of this.textures.values()) tex.dispose();
    this.textures.clear();
    this.root.clear();
  }
}
