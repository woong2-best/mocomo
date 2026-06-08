import "./glb-node-polyfill";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { AVATAR_CATALOG } from "../src/lib/virtual-avatar/avatar-catalog";
import { buildProceduralAttachment } from "../src/lib/virtual-avatar/attachment-procedural";

/** 로컬 dev용 — Node GLTFExporter 제한으로 프로덕션 빌드에서는 생략. 브라우저 IDB 캐시 사용. */

const root = join(__dirname, "..");
const force = process.env.AVATAR_PARTS_FORCE === "1";

function exportGlb(object: THREE.Object3D): Promise<ArrayBuffer> {
  const clone = object.clone(true);
  clone.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const src = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const hex =
      src instanceof THREE.MeshStandardMaterial || src instanceof THREE.MeshBasicMaterial
        ? src.color.getHex()
        : 0xffffff;
    mesh.material = new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide });
  });
  const exporter = new GLTFExporter();
  return exporter.parseAsync(clone, { binary: true }).then((result) => {
    if (result instanceof ArrayBuffer) return result;
    throw new Error("Expected binary GLB");
  });
}

async function main() {
  let written = 0;
  let skipped = 0;

  for (const item of AVATAR_CATALOG) {
    const attachment = item.appearance.attachment;
    if (!attachment?.glbUrl) continue;

    const rel = attachment.glbUrl.replace(/^\//, "");
    const dest = join(root, "public", rel);
    mkdirSync(join(dest, ".."), { recursive: true });

    if (!force && existsSync(dest)) {
      skipped += 1;
      continue;
    }

    const obj = buildProceduralAttachment(attachment, {
      primaryColor: item.previewFrom ?? "#888888",
      secondaryColor: item.previewTo,
      accentColor: item.appearance.accentColor ?? "#fbbf24",
      scale: attachment.scale ?? 1,
    });
    if (!obj) continue;

    const buffer = await exportGlb(obj);
    writeFileSync(dest, Buffer.from(buffer));
    written += 1;
  }

  console.log(`[avatar:parts] wrote ${written}, skipped ${skipped}`);
}

main().catch((e) => {
  console.error("[avatar:parts]", e);
  process.exit(1);
});
