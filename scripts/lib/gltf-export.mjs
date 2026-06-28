if (typeof globalThis.FileReader === "undefined") {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        this.onloadend?.();
      });
    }
  };
}

export async function loadThree() {
  const THREE = await import("three");
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");
  const { RoundedBoxGeometry } = await import("three/examples/jsm/geometries/RoundedBoxGeometry.js");
  return { THREE, GLTFExporter, RoundedBoxGeometry };
}

export function exportGlb(GLTFExporter, object) {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      object,
      (result) => resolve(Buffer.from(result)),
      reject,
      { binary: true },
    );
  });
}

export function shapeMat(THREE, name = "shape_neutral") {
  return new THREE.MeshStandardMaterial({
    name,
    color: new THREE.Color("#B8B0A8"),
    roughness: 0.85,
    metalness: 0,
  });
}

/** MoCoMo corner scene — shared shape language (all hero assets) */
export const SCENE_LANGUAGE = {
  bevelWood: 0.03,
  bevelPlush: 0.125,
  bevelProp: 0.024,
  bevelArch: 0.008,
};

/** Bondee toy proportion multipliers — short legs, thick bodies */
export const TOY_PROPORTION = {
  leg: 0.55,
  body: 1.14,
  top: 1.32,
  puff: 1.1,
};

export function roundedBox(THREE, RoundedBoxGeometry, w, h, d, material, rx = SCENE_LANGUAGE.bevelWood) {
  const geo = new RoundedBoxGeometry(w, h, d, 4, Math.min(rx, w / 4, h / 4, d / 4));
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
