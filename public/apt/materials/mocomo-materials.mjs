/**
 * MoCoMo Apartment — shared Material Library loader (Three.js)
 * SSOT: public/apt/materials/*.mat
 */
import * as THREE from 'three';

const cache = new Map();

export async function loadMaterialIndex(basePath = '/apt/materials') {
  const res = await fetch(`${basePath}/index.json`);
  return res.json();
}

export async function loadSlotMap(basePath = '/apt/materials') {
  const res = await fetch(`${basePath}/slot-map.json`);
  return res.json();
}

export async function loadMatDef(id, basePath = '/apt/materials') {
  if (cache.has(id)) return cache.get(id);
  const index = await loadMaterialIndex(basePath);
  const entry = index.materials.find((m) => m.id === id);
  if (!entry) throw new Error(`Material not found: ${id}`);
  const res = await fetch(`${basePath}/${entry.file}`);
  const def = await res.json();
  cache.set(id, def);
  return def;
}

export function createMaterialFromDef(THREE_NS, def) {
  return new THREE_NS.MeshStandardMaterial({
    name: def.id,
    color: new THREE_NS.Color(def.color),
    roughness: def.roughness ?? 0.75,
    metalness: def.metalness ?? 0,
  });
}

export async function buildMaterialLibrary(THREE_NS, basePath = '/apt/materials') {
  const index = await loadMaterialIndex(basePath);
  const lib = new Map();
  for (const entry of index.materials) {
    const def = await loadMatDef(entry.id, basePath);
    lib.set(entry.id, createMaterialFromDef(THREE_NS, def));
  }
  return lib;
}

/**
 * Apply shared materials to a loaded GLB scene.
 */
export function applySlotMaterials(root, library, slotMap, assetId) {
  const slots = { ...slotMap.slots };
  const overrides = slotMap.assetOverrides?.[assetId];
  if (overrides) Object.assign(slots, overrides);

  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const resolved = mats.map((m) => {
      const slotName = m.name;
      const mapping = slots[slotName];
      if (!mapping) return m;

      if (typeof mapping === 'string') {
        const libMat = library.get(mapping);
        if (!libMat) return m;
        const clone = libMat.clone();
        clone.name = slotName;
        return clone;
      }

      if (mapping.override) {
        const mat = new THREE.MeshStandardMaterial({ name: slotName });
        mat.color.set(mapping.override.color ?? '#B8B0A8');
        mat.roughness = mapping.override.roughness ?? 0.85;
        mat.metalness = mapping.override.metalness ?? 0;
        return mat;
      }

      return m;
    });
    o.material = resolved.length === 1 ? resolved[0] : resolved;
    o.castShadow = true;
    o.receiveShadow = true;
  });
}
