import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { VRM } from "@pixiv/three-vrm";
import type { AvatarConfig } from "@/lib/virtual-avatar/types";
import { getCatalogItem, type CatalogAttachment } from "@/lib/virtual-avatar/avatar-catalog";
import { buildProceduralAttachment } from "@/lib/virtual-avatar/attachment-procedural";
import { cacheAttachmentGlb, loadCachedAttachmentGlb } from "@/lib/virtual-avatar/attachment-glb-cache";
import { HAIR_COLOR_BY_INDEX } from "@/lib/virtual-avatar/face-morph-colors";

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

  async sync(vrm: VRM, config: AvatarConfig) {
    const key = JSON.stringify({
      e: config.equipped,
      h: config.hair,
      o: config.outfit,
    });
    if (key === this.cacheKey) return;
    this.cacheKey = key;
    this.clear();
    this.setDefaultHairVisible(vrm, true);

    const full = config.equipped.fullOutfitId ? getCatalogItem(config.equipped.fullOutfitId) : null;
    if (full?.appearance.attachment) {
      await this.attachItem(vrm, full.appearance.attachment, config, full.appearance.topColor ?? config.outfit.topColor);
      return;
    }

    const hair = getCatalogItem(config.equipped.hairId);
    if (hair?.appearance.attachment) {
      this.setDefaultHairVisible(vrm, false);
      await this.attachItem(
        vrm,
        hair.appearance.attachment,
        config,
        HAIR_COLOR_BY_INDEX[config.hair.colorIndex] ?? hair.appearance.topColor ?? "#1a1a1a",
        hair.previewTo
      );
    }

    const top = getCatalogItem(config.equipped.topId);
    if (top?.appearance.attachment && config.outfit.layers.top) {
      await this.attachItem(vrm, top.appearance.attachment, config, top.appearance.topColor ?? config.outfit.topColor);
    }

    const bottom = getCatalogItem(config.equipped.bottomId);
    if (bottom?.appearance.attachment && config.outfit.layers.bottom) {
      await this.attachItem(vrm, bottom.appearance.attachment, config, bottom.appearance.bottomColor ?? config.outfit.bottomColor);
    }

    if (config.outfit.layers.shoes) {
      const shoes = getCatalogItem(config.equipped.shoesId);
      if (shoes?.appearance.attachment) {
        await this.attachItem(vrm, { ...shoes.appearance.attachment, bone: "leftFoot" }, config, shoes.appearance.accentColor ?? config.outfit.accentColor);
        await this.attachItem(vrm, { ...shoes.appearance.attachment, bone: "rightFoot", offset: { x: 0, y: 0, z: 0 } }, config, shoes.appearance.accentColor ?? config.outfit.accentColor);
      }
    }

    if (config.outfit.layers.headwear && config.equipped.headwearId) {
      const head = getCatalogItem(config.equipped.headwearId);
      if (head?.appearance.attachment) {
        await this.attachItem(vrm, head.appearance.attachment, config, head.appearance.accentColor ?? config.outfit.accentColor);
      }
    }

    if (config.outfit.layers.accessories && config.equipped.accessoryId) {
      const acc = getCatalogItem(config.equipped.accessoryId);
      if (acc?.appearance.attachment) {
        await this.attachItem(vrm, acc.appearance.attachment, config, acc.appearance.accentColor ?? config.outfit.accentColor);
      }
    }
  }

  private async attachItem(
    vrm: VRM,
    attachment: CatalogAttachment,
    config: AvatarConfig,
    primaryColor: string,
    secondaryColor?: string
  ) {
    const obj = await this.resolveAttachment(attachment, {
      primaryColor,
      secondaryColor,
      accentColor: config.outfit.accentColor,
      scale: 1 + (config.hair.volume - 50) / 200,
    });
    if (!obj) return;

    const bone = vrm.humanoid?.getNormalizedBoneNode(attachment.bone as VrmBoneName);
    if (bone) bone.add(obj);
    else this.root.add(obj);
    this.attached.push(obj);
  }

  private async resolveAttachment(
    attachment: CatalogAttachment,
    options: Parameters<typeof buildProceduralAttachment>[1]
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
