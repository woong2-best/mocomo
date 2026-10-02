"use client";

import * as THREE from "three";

export type RemoteWorldPlayer = {
  userId: string;
  username: string;
  x: number;
  z: number;
  mode: string;
  activity?: string;
};

export class RemotePlayersLayer {
  private root = new THREE.Group();
  private markers = new Map<string, THREE.Group>();

  constructor(parent: THREE.Group) {
    parent.add(this.root);
  }

  sync(players: RemoteWorldPlayer[], groundY: (x: number, z: number) => number) {
    const ids = new Set(players.map((p) => p.userId));
    for (const id of this.markers.keys()) {
      if (!ids.has(id)) {
        const m = this.markers.get(id)!;
        this.root.remove(m);
        this.disposeGroup(m);
        this.markers.delete(id);
      }
    }

    for (const p of players) {
      let g = this.markers.get(p.userId);
      if (!g) {
        g = this.createMarker(p.username);
        this.markers.set(p.userId, g);
        this.root.add(g);
      }
      const y = groundY(p.x, p.z);
      g.position.set(p.x, y, p.z);
      const label = g.getObjectByName("name-label") as THREE.Sprite | undefined;
      if (label) label.position.y = 2.2;
    }
  }

  private createMarker(username: string) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.28, 0.85, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a7ae8, transparent: true, opacity: 0.85 })
    );
    body.position.y = 1;
    body.castShadow = true;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffd8b8 })
    );
    head.position.y = 1.75;
    g.add(head);

    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(8, 8, 240, 48, 12);
    } else {
      ctx.fillRect(8, 8, 240, 48);
    }
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(username.slice(0, 12), 128, 40);

    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    sprite.scale.set(2.2, 0.55, 1);
    sprite.position.y = 2.2;
    sprite.name = "name-label";
    g.add(sprite);

    return g;
  }

  private disposeGroup(g: THREE.Group) {
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
      if (o instanceof THREE.Sprite) {
        (o.material as THREE.SpriteMaterial).map?.dispose();
        o.material.dispose();
      }
    });
  }

  dispose() {
    for (const m of this.markers.values()) this.disposeGroup(m);
    this.markers.clear();
    this.root.clear();
  }
}
