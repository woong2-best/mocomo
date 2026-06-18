"use client";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLOBE_RADIUS_UNITS } from "@/lib/apt/housing-types";
import { latLngToVector3, vector3ToLatLng } from "@/lib/apt/world/geo-math";
import { WORLD_COUNTRIES, type WorldCountry } from "@/lib/apt/world/world-countries";

export type GlobePick = {
  lat: number;
  lng: number;
  country: WorldCountry;
  zoomLevel: number;
};

export type GlobeCallbacks = {
  onPick?: (pick: GlobePick) => void;
  onZoomChange?: (level: number) => void;
};

const EARTH_TEX =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg";
const BUMP_TEX =
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-topology.png";

function zoomLevelFromDistance(d: number) {
  if (d > 14) return 0;
  if (d > 9) return 1;
  if (d > 6.5) return 2;
  return 3;
}

function nearestCountry(lat: number, lng: number) {
  let best = WORLD_COUNTRIES[0];
  let bestD = Infinity;
  for (const c of WORLD_COUNTRIES) {
    const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export class AptGlobeScene {
  private mount: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private globe: THREE.Mesh;
  private marker = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xe85d4a, emissive: 0x662211, emissiveIntensity: 0.4 })
  );
  private ring: THREE.Mesh;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private callbacks: GlobeCallbacks = {};
  private raf = 0;
  private disposed = false;
  private pick: GlobePick | null = null;
  private focusCountry: WorldCountry | null = null;

  constructor(mount: HTMLElement, initialCountryCode?: string) {
    this.mount = mount;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1628);

    const w = Math.max(mount.clientWidth, 280);
    const h = Math.max(mount.clientHeight, 320);
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    this.camera.position.set(0, 2, 12);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    mount.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 5.2;
    this.controls.maxDistance = 18;
    this.controls.enablePan = false;

    const loader = new THREE.TextureLoader();
    const earthMat = new THREE.MeshPhongMaterial({
      map: loader.load(EARTH_TEX),
      bumpMap: loader.load(BUMP_TEX),
      bumpScale: 0.04,
    });
    this.globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS_UNITS, 64, 64), earthMat);
    this.scene.add(this.globe);

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.18, 32),
      new THREE.MeshBasicMaterial({ color: 0xf4a261, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    this.ring.visible = false;
    this.scene.add(this.marker, this.ring);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    sun.position.set(5, 3, 5);
    this.scene.add(sun);

    const stars = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          Array.from({ length: 900 }, () => (Math.random() - 0.5) * 80),
          3
        )
      ),
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 })
    );
    this.scene.add(stars);

    if (initialCountryCode) {
      const c = WORLD_COUNTRIES.find((x) => x.code === initialCountryCode.toUpperCase());
      if (c) this.focusCountry = c;
    }

    this.controls.addEventListener("change", this.onControlsChange);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("resize", this.onResize);

    if (this.focusCountry) this.flyTo(this.focusCountry.lat, this.focusCountry.lng, 9);
    this.loop();
  }

  setCallbacks(cb: GlobeCallbacks) {
    this.callbacks = cb;
  }

  getPick() {
    return this.pick;
  }

  flyTo(lat: number, lng: number, distance = 8) {
    const v = latLngToVector3(lat, lng, GLOBE_RADIUS_UNITS);
    const dir = new THREE.Vector3(v.x, v.y, v.z).normalize();
    this.controls.target.set(v.x, v.y, v.z);
    this.camera.position.copy(dir.multiplyScalar(distance + GLOBE_RADIUS_UNITS));
    this.placeMarker(lat, lng);
  }

  private placeMarker(lat: number, lng: number) {
    const v = latLngToVector3(lat, lng, GLOBE_RADIUS_UNITS + 0.05);
    this.marker.position.set(v.x, v.y, v.z);
    this.ring.position.copy(this.marker.position);
    const normal = new THREE.Vector3(v.x, v.y, v.z).normalize();
    this.ring.lookAt(normal.clone().add(this.ring.position));
    this.ring.visible = true;

    const country = nearestCountry(lat, lng);
    const dist = this.camera.position.distanceTo(this.controls.target);
    const zoomLevel = zoomLevelFromDistance(dist);
    this.pick = { lat, lng, country, zoomLevel };
    this.callbacks.onPick?.(this.pick);
    this.callbacks.onZoomChange?.(zoomLevel);
  }

  private onControlsChange = () => {
    if (!this.pick) return;
    const dist = this.camera.position.distanceTo(this.controls.target);
    const zoomLevel = zoomLevelFromDistance(dist);
    if (zoomLevel !== this.pick.zoomLevel) {
      this.pick = { ...this.pick, zoomLevel };
      this.callbacks.onZoomChange?.(zoomLevel);
      this.callbacks.onPick?.(this.pick);
    }
  };

  private onPointerDown = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.globe);
    if (!hits.length) return;
    const p = hits[0].point;
    const { lat, lng } = vector3ToLatLng(p.x, p.y, p.z);
    this.flyTo(lat, lng, Math.min(this.camera.position.distanceTo(this.controls.target), 7.5));
  };

  private onResize = () => {
    const w = this.mount.clientWidth;
    const h = this.mount.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    this.controls.update();
    this.globe.rotation.y += 0.0003;
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    this.controls.removeEventListener("change", this.onControlsChange);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.controls.dispose();
    this.globe.geometry.dispose();
    (this.globe.material as THREE.Material).dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
