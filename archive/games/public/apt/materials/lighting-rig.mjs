/**
 * MoCoMo Corner Sample — frozen lighting rig (Lighting Pass #1 approved)
 */
export function applyLockedLighting(THREE, scene, renderer) {
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xe8c9a0, 0.45));

  const key = new THREE.DirectionalLight(0xfff4e6, 1.15);
  key.position.set(6, 10, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0008;
  key.shadow.radius = 2;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xe8f0ff, 0.28);
  fill.position.set(-4, 6, -2);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xfff0d8, 0.18);
  rim.position.set(-2, 5, 6);
  scene.add(rim);

  const window = new THREE.DirectionalLight(0xffe8c8, 0.42);
  window.position.set(-8, 4, -0.5);
  scene.add(window);

  scene.add(new THREE.AmbientLight(0xfff6ee, 0.06));

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
}

export const LIGHTING_RIG = {
  locked: true,
  lockedAt: '2026-06-27',
  hemisphere: { sky: '#FFF4E6', ground: '#E8C9A0', intensity: 0.45 },
  key: { color: '#FFF4E6', intensity: 1.15, position: [6, 10, 4], shadow: 'PCF soft 2048' },
  fill: { color: '#E8F0FF', intensity: 0.28, position: [-4, 6, -2] },
  rim: { color: '#FFF0D8', intensity: 0.18, position: [-2, 5, 6] },
  windowBounce: { color: '#FFE8C8', intensity: 0.42, position: [-8, 4, -0.5] },
  ambient: { color: '#FFF6EE', intensity: 0.06 },
  toneMapping: 'ACESFilmic',
  exposure: 1.0,
};
