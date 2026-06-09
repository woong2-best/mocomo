import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarConfig } from "@/lib/virtual-avatar/types";
import { buildProceduralAttachment } from "@/lib/virtual-avatar/attachment-procedural";
import { cacheAttachmentGlb, loadCachedAttachmentGlb } from "@/lib/virtual-avatar/attachment-glb-cache";
import type { CatalogAttachment } from "@/lib/virtual-avatar/avatar-catalog";

type VrmBoneName =
  | "head"
  | "neck"
  | "chest"
  | "spine"
  | "hips"
  | "leftFoot"
  | "rightFoot"
  | "leftHand"
  | "rightHand"
  | "leftUpperArm"
  | "rightUpperArm";

const GLB_CACHE = new Map<string, THREE.Object3D>();

export class VrmAttachmentManager {
  private root = new THREE.Group();
  private loader = new GLTFLoader();
  private cacheKey = "";
  private mountedVrm: VRM | null = null;
  private attached: THREE.Object3D[] = [];

  constructor() {
    this.root.name = "mocomo_attachments";
  }

  mount(vrm: VRM) {
    this.mountedVrm = vrm;
    if (!vrm.scene.children.includes(this.root)) vrm.scene.add(this.root);
  }

  unmount() {
    this.clear();
    this.root.removeFromParent();
    this.mountedVrm = null;
  }

  async sync(vrm: VRM) {
    if (this.cacheKey === "native-only") return;
    this.cacheKey = "native-only";
    this.clear();
    this.setDefaultHairVisible(vrm, true);
  }

  private async attachItem(
    vrm: VRM,
    attachment: CatalogAttachment,
    config: AvatarConfig,
    primaryColor: string,
    secondaryColor?: string,
    allowProceduralFallback = true
  ) {
    const obj = await this.resolveAttachment(
      attachment,
      {
        primaryColor,
        secondaryColor,
        accentColor: config.outfit.accentColor,
        scale: 1 + (config.hair.volume - 50) / 200,
      },
      allowProceduralFallback
    );
    if (!obj) return;

    const bone = vrm.humanoid?.getNormalizedBoneNode(attachment.bone as VrmBoneName);
    if (bone) bone.add(obj);
    else this.root.add(obj);
    this.attached.push(obj);
  }

  private async resolveAttachment(
    attachment: CatalogAttachment,
    options: Parameters<typeof buildProceduralAttachment>[1],
    allowProceduralFallback = true
  ): Promise<THREE.Object3D | null> {
    if (attachment.glbUrl) {
      const cached = GLB_CACHE.get(attachment.glbUrl);
      if (cached) {
        const clone = cached.clone(true);
        this.applyRuntimeColors(clone, options);
        return clone;
      }
      try {
        const network = await this.loader.loadAsync(attachment.glbUrl);
        const scene = network.scene;
        GLB_CACHE.set(attachment.glbUrl, scene);
        const clone = scene.clone(true);
        this.applyRuntimeColors(clone, options);
        return clone;
      } catch {
        const idb = await loadCachedAttachmentGlb(attachment.glbUrl);
        if (idb) {
          GLB_CACHE.set(attachment.glbUrl, idb);
          const clone = idb.clone(true);
          this.applyRuntimeColors(clone, options);
          return clone;
        }
      }
    }
    if (!allowProceduralFallback) return null;
    const procedural = buildProceduralAttachment(attachment, options);
    if (procedural && attachment.glbUrl) {
      cacheAttachmentGlb(attachment.glbUrl, procedural);
    }
    return procedural;
  }

  private applyRuntimeColors(
    obj: THREE.Object3D,
    options: Parameters<typeof buildProceduralAttachment>[1]
  ) {
    const palette = [
      options.primaryColor,
      options.secondaryColor ?? options.primaryColor,
      options.accentColor ?? options.primaryColor,
    ];
    let i = 0;
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh || !mesh.material) return;
      const tint = (m: THREE.Material) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          const next = m.clone();
          next.color = new THREE.Color(palette[i % palette.length]);
          i += 1;
          return next;
        }
        return m.clone();
      };
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map(tint)
        : tint(mesh.material);
    });
  }

  private setDefaultHairVisible(vrm: VRM, visible: boolean) {
    vrm.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.name.toLowerCase().includes("hair")) mesh.visible = visible;
    });
  }

  private clear() {
    this.attached.forEach((obj) => {
      obj.removeFromParent();
      this.disposeObject(obj);
    });
    this.attached = [];
    while (this.root.children.length) {
      this.disposeObject(this.root.children[0]);
      this.root.remove(this.root.children[0]);
    }
  }

  private disposeObject(obj: THREE.Object3D) {
    obj.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m?.dispose());
      }
    });
  }

  dispose() {
    this.unmount();
  }
}
