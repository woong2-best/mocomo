import * as THREE from "three";
import type { CatalogAttachment } from "@/lib/virtual-avatar/avatar-catalog";

export type AttachmentBuildOptions = {
  primaryColor: string;
  secondaryColor?: string;
  accentColor?: string;
  scale?: number;
};

function mat(color: string, opts?: { metalness?: number; roughness?: number; transparent?: boolean; opacity?: number; side?: THREE.Side; emissive?: string; emissiveIntensity?: number }) {
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: opts?.metalness ?? 0.08,
    roughness: opts?.roughness ?? 0.55,
    side: opts?.side ?? THREE.DoubleSide,
  });
  if (opts?.transparent) {
    m.transparent = true;
    m.opacity = opts.opacity ?? 0.85;
  }
  if (opts?.emissive) {
    m.emissive = new THREE.Color(opts.emissive);
    m.emissiveIntensity = opts.emissiveIntensity ?? 0.12;
  }
  return m;
}

/** 고품질 구체 — VTuber 클로즈업용 */
function hqSphere(r: number, color: string, opts?: Parameters<typeof mat>[1]) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), mat(color, opts));
}

function hqCylinder(rt: number, rb: number, h: number, color: string, segs = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segs), mat(color));
}

function group(name: string, children: THREE.Object3D[]) {
  const g = new THREE.Group();
  g.name = name;
  children.forEach((c) => g.add(c));
  return g;
}

function pm(
  geo: THREE.BufferGeometry,
  color: string,
  x = 0,
  y = 0,
  z = 0,
  rot?: { x?: number; y?: number; z?: number },
  matOpts?: Parameters<typeof mat>[1]
) {
  const mesh = new THREE.Mesh(geo, mat(color, matOpts));
  mesh.position.set(x, y, z);
  if (rot?.x !== undefined) mesh.rotation.x = rot.x;
  if (rot?.y !== undefined) mesh.rotation.y = rot.y;
  if (rot?.z !== undefined) mesh.rotation.z = rot.z;
  return mesh;
}

function softTorso(w: number, h: number, d: number, color: string, opts?: Parameters<typeof mat>[1]) {
  return group("torso", [
    pm(new THREE.BoxGeometry(w, h, d, 3, 3, 3), color, 0, 0, 0, undefined, opts),
    pm(new THREE.SphereGeometry(w * 0.2, 14, 12), color, -w * 0.44, h * 0.32, 0, undefined, opts),
    pm(new THREE.SphereGeometry(w * 0.2, 14, 12), color, w * 0.44, h * 0.32, 0, undefined, opts),
    pm(new THREE.SphereGeometry(w * 0.16, 12, 10), color, 0, h * 0.48, 0, undefined, opts),
  ]);
}

function softSleeve(color: string, side: -1 | 1, length = 0.22) {
  return pm(new THREE.CylinderGeometry(0.055, 0.048, length, 12), color, side * 0.24, 0.02, 0, { z: side * 0.15 });
}

function hairStrands(count: number, color: string, length: number, spread: number) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const geo = new THREE.PlaneGeometry(0.055, length, 1, 6);
    geo.computeVertexNormals();
    const plane = new THREE.Mesh(geo, mat(color, { roughness: 0.78 }));
    const a = (i / count) * Math.PI * 2;
    plane.position.set(Math.sin(a) * spread, -length * 0.35, Math.cos(a) * spread * 0.7);
    plane.rotation.y = a;
    plane.rotation.x = -0.28 + Math.sin(a * 2) * 0.08;
    g.add(plane);
  }
  return g;
}

const HAIR_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  long_wave: (o) =>
    group("hair_long_wave", [
      hairStrands(18, o.primaryColor, 0.55 * (o.scale ?? 1), 0.18),
      hqSphere(0.19, o.primaryColor, { roughness: 0.72 }),
    ]),
  bob: (o) =>
    group("hair_bob", [
      hqSphere(0.2, o.primaryColor),
      hairStrands(10, o.primaryColor, 0.22, 0.16),
    ]),
  ponytail: (o) =>
    group("hair_ponytail", [
      new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(o.primaryColor)),
      new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.45, 10), mat(o.primaryColor)).translateY(-0.35).rotateX(0.35),
    ]),
  twintail: (o) =>
    group("hair_twintail", [
      new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), mat(o.primaryColor)),
      pm(new THREE.CylinderGeometry(0.05, 0.03, 0.35, 8), o.primaryColor, -0.14, -0.12, -0.05, { z: 0.45 }),
      pm(new THREE.CylinderGeometry(0.05, 0.03, 0.35, 8), o.primaryColor, 0.14, -0.12, -0.05, { z: -0.45 }),
    ]),
  short: (o) => new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(o.primaryColor)),
  volume: (o) => new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 12), mat(o.primaryColor, { roughness: 0.75 })),
  braid: (o) => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.022, 8, 12), mat(i % 2 ? o.secondaryColor ?? o.primaryColor : o.primaryColor));
      torus.position.y = -i * 0.07;
      torus.rotation.x = Math.PI / 2;
      g.add(torus);
    }
    return g;
  },
  wolf: (o) => {
    const g = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 6), mat(o.primaryColor));
      const a = (i / 10) * Math.PI * 2;
      cone.position.set(Math.sin(a) * 0.16, 0.04, Math.cos(a) * 0.12);
      cone.rotation.z = Math.sin(a) * 0.4;
      cone.rotation.x = -0.5;
      g.add(cone);
    }
    return g;
  },
  hime: (o) => group("hair_hime", [hairStrands(10, o.primaryColor, 0.62, 0.14), hairStrands(4, o.primaryColor, 0.18, 0.1).translateZ(0.12)]),
  pixie: (o) => new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.35), mat(o.primaryColor)),
  half_up: (o) => group("hair_half", [
    new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(o.primaryColor)),
    new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.3, 8), mat(o.secondaryColor ?? o.primaryColor)).translateY(-0.28),
  ]),
  updo: (o) => new THREE.Mesh(new THREE.TorusKnotGeometry(0.08, 0.025, 64, 8), mat(o.primaryColor)),
  curtain_bangs: (o) => group("bangs", [
    hairStrands(5, o.primaryColor, 0.2, 0.08).translateZ(0.14),
    hairStrands(12, o.primaryColor, 0.48, 0.15),
  ]),
  layered: (o) => group("layers", [
    new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 10), mat(o.primaryColor, { transparent: true, opacity: 0.92 })),
    new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), mat(o.secondaryColor ?? o.primaryColor)).translateY(-0.04),
  ]),
  natural: (o) => hairStrands(11, o.primaryColor, 0.42, 0.16),
  durag_long: (o) => group("durag", [hairStrands(16, o.primaryColor, 0.68, 0.12)]),
  cyber: (o) => {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.04), mat(i % 2 ? o.accentColor ?? "#22d3ee" : o.primaryColor, { metalness: 0.6 }));
      box.rotation.y = (i / 8) * Math.PI;
      box.position.y = -0.12;
      g.add(box);
    }
    return g;
  },
  gradient: (o) => group("grad", [hairStrands(13, o.primaryColor, 0.5, 0.16), hairStrands(6, o.secondaryColor ?? o.accentColor ?? "#f472b6", 0.35, 0.12).translateY(-0.08)]),
  silver_bob: (o) => HAIR_BUILDERS.bob({ ...o, primaryColor: o.secondaryColor ?? "#b0b8c0" }),
  two_tone: (o) => group("two_tone", [
    new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), mat(o.primaryColor)),
    hairStrands(8, o.secondaryColor ?? o.accentColor ?? "#f472b6", 0.28, 0.14),
  ]),
  princess: (o) => group("princess", [
    hairStrands(16, o.primaryColor, 0.58, 0.17),
    new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 24), mat(o.accentColor ?? "#fbbf24", { metalness: 0.7 })).translateY(0.06),
  ]),
  bohemian: (o) => {
    const g = hairStrands(15, o.primaryColor, 0.52, 0.18);
    g.rotation.y = 0.2;
    return g;
  },
};

const HEADWEAR_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  cap: (o) =>
    group("cap", [
      new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(o.primaryColor)),
      new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 20), mat(o.secondaryColor ?? o.primaryColor)).translateY(0.02).rotateX(Math.PI / 2),
    ]),
  beanie: (o) => new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), mat(o.primaryColor, { roughness: 0.9 })),
  headphones: (o) =>
    group("headphones", [
      new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 24, Math.PI), mat(o.secondaryColor ?? "#334155")).rotateX(Math.PI / 2).translateY(0.04),
      pm(new THREE.TorusGeometry(0.06, 0.025, 8, 16), o.primaryColor, -0.2, 0, 0, { y: Math.PI / 2 }),
      pm(new THREE.TorusGeometry(0.06, 0.025, 8, 16), o.primaryColor, 0.2, 0, 0, { y: Math.PI / 2 }),
    ]),
  crown: (o) => {
    const g = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.1, 6), mat(o.accentColor ?? "#fbbf24", { metalness: 0.85 }));
      const a = (i / 8) * Math.PI * 2;
      spike.position.set(Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.15);
      g.add(spike);
    }
    return g;
  },
  cat_ears: (o) =>
    group("cat_ears", [
      pm(new THREE.ConeGeometry(0.07, 0.14, 8), o.primaryColor, -0.1, 0.12, 0.02, { z: 0.25 }),
      pm(new THREE.ConeGeometry(0.07, 0.14, 8), o.primaryColor, 0.1, 0.12, 0.02, { z: -0.25 }),
    ]),
  beret: (o) => {
    const m = pm(new THREE.SphereGeometry(0.18, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.35), o.primaryColor, 0, 0.05, 0);
    m.scale.set(1, 0.35, 1);
    return m;
  },
};

const ACCESSORY_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  necklace: (o) => new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 8, 24), mat(o.accentColor ?? "#fbbf24", { metalness: 0.9 })).rotateX(Math.PI / 2).translateY(-0.12),
  glasses: (o) =>
    group("glasses", [
      pm(new THREE.TorusGeometry(0.048, 0.005, 12, 24), o.primaryColor, -0.058, 0.022, 0.11, undefined, { metalness: 0.85, roughness: 0.2 }),
      pm(new THREE.TorusGeometry(0.048, 0.005, 12, 24), o.primaryColor, 0.058, 0.022, 0.11, undefined, { metalness: 0.85, roughness: 0.2 }),
      pm(new THREE.BoxGeometry(0.045, 0.005, 0.005), o.primaryColor, 0, 0.022, 0.11, undefined, { metalness: 0.85 }),
      pm(new THREE.PlaneGeometry(0.042, 0.038), o.secondaryColor ?? "#88ccff", -0.058, 0.022, 0.108, undefined, { transparent: true, opacity: 0.35 }),
      pm(new THREE.PlaneGeometry(0.042, 0.038), o.secondaryColor ?? "#88ccff", 0.058, 0.022, 0.108, undefined, { transparent: true, opacity: 0.35 }),
    ]),
  mask: (o) => new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.07), mat(o.primaryColor, { transparent: true, opacity: 0.85 })).translateZ(0.12),
  wings: (o) =>
    group("wings", [
      pm(new THREE.PlaneGeometry(0.5, 0.62, 4, 6), o.primaryColor, -0.24, 0.06, -0.14, { y: 0.38, z: 0.15 }, { transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
      pm(new THREE.PlaneGeometry(0.5, 0.62, 4, 6), o.secondaryColor ?? o.primaryColor, 0.24, 0.06, -0.14, { y: -0.38, z: -0.15 }, { transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
    ]),
  tail: (o) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.05, -0.15, -0.15),
      new THREE.Vector3(-0.05, -0.3, -0.25),
      new THREE.Vector3(0, -0.42, -0.18),
    ]);
    const geo = new THREE.TubeGeometry(curve, 16, 0.035, 8, false);
    return new THREE.Mesh(geo, mat(o.primaryColor, { roughness: 0.7 }));
  },
  ring: (o) => new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 8, 12), mat(o.accentColor ?? "#fbbf24", { metalness: 0.95 })).rotateX(Math.PI / 2),
};

const TOP_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  tee: (o) =>
    group("tee", [
      softTorso(0.38, 0.22, 0.18, o.primaryColor, { roughness: 0.68 }),
      softSleeve(o.primaryColor, -1),
      softSleeve(o.primaryColor, 1),
    ]),
  hoodie: (o) =>
    group("hoodie", [
      softTorso(0.4, 0.24, 0.2, o.primaryColor, { roughness: 0.82 }),
      softSleeve(o.primaryColor, -1, 0.26),
      softSleeve(o.primaryColor, 1, 0.26),
      pm(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), o.secondaryColor ?? o.primaryColor, 0, 0.14, -0.02, undefined, { roughness: 0.88 }),
      pm(new THREE.TorusGeometry(0.09, 0.012, 8, 16, Math.PI), o.secondaryColor ?? "#334155", 0, -0.02, 0.1, { x: Math.PI / 2 }),
    ]),
  crop: (o) => softTorso(0.34, 0.14, 0.16, o.primaryColor).translateY(0.02),
  blouse: (o) => {
    const g = pm(new THREE.CylinderGeometry(0.16, 0.22, 0.2, 16, 1, true), o.primaryColor, 0, -0.04, 0, undefined, { roughness: 0.62 });
    return g;
  },
  jacket: (o) =>
    group("jacket", [
      softTorso(0.42, 0.26, 0.22, o.primaryColor, { roughness: 0.45, metalness: 0.12 }),
      pm(new THREE.BoxGeometry(0.09, 0.26, 0.13, 2, 2, 2), o.secondaryColor ?? o.primaryColor, -0.23, 0, 0.02),
      pm(new THREE.BoxGeometry(0.09, 0.26, 0.13, 2, 2, 2), o.secondaryColor ?? o.primaryColor, 0.23, 0, 0.02),
      pm(new THREE.BoxGeometry(0.14, 0.04, 0.18), o.accentColor ?? "#64748b", 0, 0.1, 0.12, undefined, { metalness: 0.7 }),
    ]),
  cardigan: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.2, 1, 1, 1), mat(o.primaryColor, { roughness: 0.85 })).translateY(-0.03),
  leather: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.2), mat(o.primaryColor, { metalness: 0.25, roughness: 0.35 })),
  frill: (o) => group("frill", [
    new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.18, 16, 1, true), mat(o.primaryColor)),
    new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 8, 24), mat(o.accentColor ?? "#fff")).translateY(-0.08),
  ]),
  cyber_top: (o) => {
    const m = mat(o.primaryColor, { metalness: 0.55, roughness: 0.35 });
    m.emissive = new THREE.Color(o.accentColor ?? "#22d3ee");
    m.emissiveIntensity = 0.15;
    return new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.16), m);
  },
  offshoulder: (o) => new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.16, 14, 1, true), mat(o.primaryColor)).translateY(0.02),
};

const BOTTOM_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  denim: (o) => group("denim", [
    pm(new THREE.BoxGeometry(0.16, 0.32, 0.14), o.primaryColor, -0.1, -0.28, 0),
    pm(new THREE.BoxGeometry(0.16, 0.32, 0.14), o.primaryColor, 0.1, -0.28, 0),
  ]),
  mini_skirt: (o) => new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.12, 16, 1, true), mat(o.primaryColor)).translateY(-0.18),
  slacks: (o) => group("slacks", [
    pm(new THREE.BoxGeometry(0.15, 0.36, 0.13), o.primaryColor, -0.09, -0.32, 0),
    pm(new THREE.BoxGeometry(0.15, 0.36, 0.13), o.primaryColor, 0.09, -0.32, 0),
  ]),
  shorts: (o) => group("shorts", [
    pm(new THREE.BoxGeometry(0.17, 0.14, 0.14), o.primaryColor, -0.09, -0.18, 0),
    pm(new THREE.BoxGeometry(0.17, 0.14, 0.14), o.primaryColor, 0.09, -0.18, 0),
  ]),
  pleats: (o) => new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.2, 16, 1, true), mat(o.primaryColor)).translateY(-0.2),
  cargo: (o) => group("cargo", [
    pm(new THREE.BoxGeometry(0.17, 0.34, 0.15), o.primaryColor, -0.1, -0.3, 0),
    pm(new THREE.BoxGeometry(0.17, 0.34, 0.15), o.primaryColor, 0.1, -0.3, 0),
    pm(new THREE.BoxGeometry(0.06, 0.08, 0.04), o.secondaryColor ?? o.primaryColor, -0.14, -0.26, 0.06),
  ]),
  leggings: (o) => group("leggings", [
    pm(new THREE.CylinderGeometry(0.07, 0.06, 0.38, 10), o.primaryColor, -0.09, -0.32, 0),
    pm(new THREE.CylinderGeometry(0.07, 0.06, 0.38, 10), o.primaryColor, 0.09, -0.32, 0),
  ]),
  highwaist: (o) => new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.22, 16, 1, true), mat(o.primaryColor)).translateY(-0.22),
};

const SHOES_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  sneaker: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.16), mat(o.primaryColor)).translateY(-0.02),
  hightop: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.16), mat(o.primaryColor)).translateY(0.02),
  loafer: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.04, 0.15), mat(o.primaryColor, { metalness: 0.2 })),
  boots: (o) => new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.18, 10), mat(o.primaryColor)).translateY(0.04),
  sandal: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.14), mat(o.primaryColor, { roughness: 0.4 })),
  flat: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.13), mat(o.primaryColor)),
};

const FULL_BUILDERS: Record<string, (o: AttachmentBuildOptions) => THREE.Object3D> = {
  dress: (o) => new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.55, 16, 1, true), mat(o.primaryColor)).translateY(-0.18),
  suit: (o) => group("suit", [
    new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.26, 0.2), mat(o.primaryColor)),
    pm(new THREE.BoxGeometry(0.16, 0.34, 0.14), o.secondaryColor ?? o.primaryColor, -0.1, -0.3, 0),
    pm(new THREE.BoxGeometry(0.16, 0.34, 0.14), o.secondaryColor ?? o.primaryColor, 0.1, -0.3, 0),
  ]),
  fantasy: (o) => group("fantasy", [
    new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.62, 18, 1, true), mat(o.primaryColor, { roughness: 0.4 })),
    new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.01, 6, 24), mat(o.accentColor ?? "#fbbf24", { metalness: 0.8 })).translateY(-0.05),
  ]),
  cyber_suit: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.18), mat(o.primaryColor, { metalness: 0.5, roughness: 0.25 })),
  party: (o) => new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 20, 1, true), mat(o.primaryColor, { roughness: 0.35, metalness: 0.15 })),
  sport: (o) => group("sport", [
    new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.16), mat(o.primaryColor)),
    pm(new THREE.BoxGeometry(0.15, 0.3, 0.13), o.secondaryColor ?? o.primaryColor, -0.09, -0.28, 0),
    pm(new THREE.BoxGeometry(0.15, 0.3, 0.13), o.secondaryColor ?? o.primaryColor, 0.09, -0.28, 0),
  ]),
  cozy: (o) => new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.2), mat(o.primaryColor, { roughness: 0.92 })),
};

export function buildProceduralAttachment(
  attachment: CatalogAttachment,
  options: AttachmentBuildOptions
): THREE.Object3D | null {
  const scale = (attachment.scale ?? 1) * (options.scale ?? 1);
  const builders =
    HAIR_BUILDERS[attachment.template] ??
    HEADWEAR_BUILDERS[attachment.template] ??
    ACCESSORY_BUILDERS[attachment.template] ??
    TOP_BUILDERS[attachment.template] ??
    BOTTOM_BUILDERS[attachment.template] ??
    SHOES_BUILDERS[attachment.template] ??
    FULL_BUILDERS[attachment.template];

  if (!builders) return null;

  const obj = builders(options);
  obj.scale.setScalar(scale);
  if (attachment.offset) obj.position.set(attachment.offset.x, attachment.offset.y, attachment.offset.z);
  if (attachment.rotation) obj.rotation.set(attachment.rotation.x, attachment.rotation.y, attachment.rotation.z);
  obj.name = `attach_${attachment.template}`;
  return obj;
}

export const HAIR_TEMPLATES = Object.keys(HAIR_BUILDERS);
export const HEADWEAR_TEMPLATES = Object.keys(HEADWEAR_BUILDERS);
