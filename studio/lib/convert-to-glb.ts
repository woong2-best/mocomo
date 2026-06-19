"use client";

import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { STUDIO_IMPORT_EXTENSIONS } from "./constants";

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

export function isStudioImportExtension(filename: string): boolean {
  const ext = extOf(filename);
  return STUDIO_IMPORT_EXTENSIONS.includes(ext as (typeof STUDIO_IMPORT_EXTENSIONS)[number]);
}

export function needsGlbConversion(filename: string): boolean {
  const ext = extOf(filename);
  return ext === ".obj" || ext === ".fbx";
}

function exportSceneToGlb(scene: THREE.Object3D): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result);
        else reject(new Error("GLB 변환에 실패했습니다"));
      },
      (error) => reject(error instanceof Error ? error : new Error(String(error))),
      { binary: true, onlyVisible: false, truncateDrawRange: true }
    );
  });
}

/** OBJ/FBX는 브라우저에서 GLB로 변환 후 기존 업로드 파이프라인 사용 */
export async function prepareStudioUploadFile(file: File): Promise<File> {
  const ext = extOf(file.name);
  if (ext === ".glb" || ext === ".gltf") return file;

  const buffer = await file.arrayBuffer();
  let root: THREE.Object3D;

  if (ext === ".obj") {
    const text = new TextDecoder().decode(buffer);
    root = new OBJLoader().parse(text);
  } else if (ext === ".fbx") {
    root = new FBXLoader().parse(buffer, "");
  } else {
    throw new Error("지원하지 않는 형식입니다 (.glb, .gltf, .obj, .fbx)");
  }

  const scene = new THREE.Scene();
  scene.add(root);

  const glbBuffer = await exportSceneToGlb(scene);
  const baseName = file.name.replace(/\.[^.]+$/i, "");
  return new File([glbBuffer], `${baseName}.glb`, { type: "model/gltf-binary" });
}
