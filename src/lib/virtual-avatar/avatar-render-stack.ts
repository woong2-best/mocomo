import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SSAOPass } from "three/addons/postprocessing/SSAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import type { RenderQuality } from "@/lib/virtual-avatar/types";

export class AvatarRenderStack {
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private envMap: THREE.Texture | null = null;
  private pmrem: THREE.PMREMGenerator | null = null;
  private quality: RenderQuality = "studio";
  private transparentMode = false;
  private liveCaptureQuality = false;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera
  ) {
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.initEnvironment();
  }

  private initEnvironment() {
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.pmrem.compileEquirectangularShader();
    const room = new RoomEnvironment();
    this.envMap = this.pmrem.fromScene(room, 0.04).texture;
    this.scene.environment = this.envMap;
  }

  getEnvironmentMap() {
    return this.envMap;
  }

  setTransparentMode(on: boolean) {
    this.transparentMode = on;
    this.rebuildComposer();
  }

  /** WHIP VTuber — 투명 배경이어도 블룸·톤매핑 유지 */
  setLiveCaptureQuality(on: boolean) {
    this.liveCaptureQuality = on;
    if (on) {
      this.renderer.toneMappingExposure = 1.12;
    }
    this.rebuildComposer();
  }

  setQuality(quality: RenderQuality) {
    if (this.quality === quality) return;
    this.quality = quality;
    this.applyPixelRatio();
    this.rebuildComposer();
  }

  private applyPixelRatio() {
    const cap =
      this.quality === "cinematic" ? 2.5 : this.quality === "studio" ? 2 : 1.5;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
  }

  private rebuildComposer() {
    this.composer?.dispose();
    this.composer = null;
    this.bloomPass = null;
    this.ssaoPass = null;

    if (this.quality === "performance") return;
    if (this.transparentMode && !this.liveCaptureQuality) return;

    const w = this.renderer.domElement.width;
    const h = this.renderer.domElement.height;
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomStrength = this.liveCaptureQuality ? 0.22 : 0.28;
    const bloomRadius = this.liveCaptureQuality ? 0.28 : 0.35;
    if (this.quality === "studio" || this.quality === "cinematic") {
      const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), bloomStrength, bloomRadius, 0.92);
      composer.addPass(bloom);
      this.bloomPass = bloom;
    }

    if (this.quality === "cinematic" && !this.liveCaptureQuality) {
      const ssao = new SSAOPass(this.scene, this.camera, w, h);
      ssao.kernelRadius = 12;
      ssao.minDistance = 0.002;
      ssao.maxDistance = 0.18;
      composer.addPass(ssao);
      this.ssaoPass = ssao;
    }

    composer.addPass(new OutputPass());
    this.composer = composer;
  }

  resize(width: number, height: number) {
    this.applyPixelRatio();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setSize(width, height);
      if (this.bloomPass) this.bloomPass.resolution.set(width, height);
      if (this.ssaoPass) this.ssaoPass.setSize(width, height);
    }
  }

  render() {
    if (this.composer && this.quality !== "performance" && (!this.transparentMode || this.liveCaptureQuality)) {
      this.composer.render();
      return;
    }
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.composer?.dispose();
    this.envMap?.dispose();
    this.pmrem?.dispose();
  }
}
