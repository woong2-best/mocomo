/**
 * APT Isometric 3D Renderer
 *
 * Architecture (Three.js + R3F):
 * ┌──────────────────────────────────────────────┐
 * │ AptGameShell (HTML HUD / nav)                │
 * ├──────────────────────────────────────────────┤
 * │ IsoCanvas (@react-three/fiber)               │
 * │  ├─ OrthographicCamera (isometric preset)  │
 * │  ├─ IsoLighting (ambient + directional)      │
 * │  ├─ IsoHomeMeshes (bondee buildHomeFloorGroup│
 * │  │    wallStyle: dollhouse-open)             │
 * │  ├─ IsoPlacementGrid (edit mode)             │
 * │  └─ IsoSceneInteraction (raycast)            │
 * ├──────────────────────────────────────────────┤
 * │ DioramaFurniturePalette (HTML, shop tabs)    │
 * └──────────────────────────────────────────────┘
 *
 * Data: BondeePlacedItem[] grid layout (gx/gz/rot)
 * Geometry: lib/apt/bondee procedural PBR meshes
 */

export * from "./types";
export * from "./camera";
export * from "./catalog-map";
export * from "./default-layouts";
