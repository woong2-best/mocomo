export type GenderExpression = "female" | "male" | "neutral";
export type FaceShape =
  | "oval"
  | "round"
  | "square"
  | "long"
  | "heart"
  | "invertedTriangle"
  | "diamond"
  | "triangle";
export type OutfitPreset = "casual" | "dressy" | "office" | "game" | "fantasy" | "cyberpunk";
export type MotionId = "idle" | "wave" | "dance" | "talk" | "smile" | "bow";
export type ParticleEffect = "none" | "glitter" | "hearts" | "stars" | "fireworks";
export type BackgroundId = "space" | "pink" | "cyber" | "nature" | "solid";
export type AvatarStyle = "anime" | "realistic" | "cartoon" | "cyberpunk";
export type RenderQuality = "performance" | "studio" | "cinematic";

export type ShopCategory =
  | "all"
  | "hair"
  | "fullOutfit"
  | "top"
  | "bottom"
  | "headwear"
  | "shoes"
  | "accessory"
  | "makeup";

export type PaintZone = "face" | "body" | "all";

export interface AvatarPaintStroke {
  x: number;
  y: number;
  radius: number;
  color: string;
  opacity: number;
  zone: PaintZone;
}

export interface AvatarPaintParams {
  enabled: boolean;
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  activeZone: PaintZone;
  strokes: AvatarPaintStroke[];
}

export interface SculptDelta {
  vi: number;
  dx: number;
  dy: number;
  dz: number;
}

export interface AvatarSculptParams {
  enabled: boolean;
  brushRadius: number;
  brushStrength: number;
  deltas: SculptDelta[];
}

export interface AvatarMakeupParams {
  eyeshadow: number;
  eyeliner: number;
  mascara: number;
  blushIntensity: number;
  lipstick: number;
  lipColorIndex: number;
  lipColorHex: string;
  contour: number;
  highlight: number;
}

export interface AvatarFaceParams {
  faceShape: FaceShape;
  eyeSize: number;
  eyeSpacing: number;
  eyeTilt: number;
  eyeHeight: number;
  eyeDepth: number;
  doubleEyelid: number;
  eyeColorIndex: number;
  eyeColorHex: string;
  pupilSize: number;
  browHeight: number;
  browThickness: number;
  browSpacing: number;
  browTilt: number;
  noseSize: number;
  noseHeight: number;
  noseWidth: number;
  noseBridge: number;
  noseTip: number;
  lipThickness: number;
  lipWidth: number;
  mouthCorner: number;
  philtrum: number;
  jawWidth: number;
  jawAngle: number;
  chinLength: number;
  chinPoint: number;
  cheekbone: number;
  forehead: number;
  makeup: AvatarMakeupParams;
}

export interface AvatarBodyParams {
  height: number;
  weight: number;
  shoulderWidth: number;
  waist: number;
  armLength: number;
  armThickness: number;
  legLength: number;
  genderExpression: GenderExpression;
}

export interface AvatarSkinParams {
  toneIndex: number;
  brightness: number;
  saturation: number;
  freckles: boolean;
  blush: boolean;
  glow: boolean;
}

export interface AvatarOutfitParams {
  preset: OutfitPreset;
  topColor: string;
  bottomColor: string;
  accentColor: string;
  layers: {
    top: boolean;
    bottom: boolean;
    shoes: boolean;
    accessories: boolean;
    headwear: boolean;
  };
}

export interface AvatarHairParams {
  style: number;
  volume: number;
  length: number;
  colorIndex: number;
  colorHex: string;
  gradient: boolean;
  highlight: boolean;
}

export interface AvatarEffectsParams {
  motion: MotionId;
  particle: ParticleEffect;
  background: BackgroundId;
  animationPlaying: boolean;
  renderQuality: RenderQuality;
  celShading: boolean;
}

export interface AvatarViewState {
  zoom: number;
  rotation: number;
  autoRotate: boolean;
}

export interface AvatarEquippedItems {
  hairId: string | null;
  topId: string | null;
  bottomId: string | null;
  shoesId: string | null;
  headwearId: string | null;
  accessoryId: string | null;
  fullOutfitId: string | null;
  makeupId: string | null;
}

export interface AvatarConfig {
  style: AvatarStyle;
  body: AvatarBodyParams;
  face: AvatarFaceParams;
  skin: AvatarSkinParams;
  outfit: AvatarOutfitParams;
  hair: AvatarHairParams;
  effects: AvatarEffectsParams;
  view: AvatarViewState;
  equipped: AvatarEquippedItems;
  paint: AvatarPaintParams;
  sculpt: AvatarSculptParams;
}

export const DEFAULT_PAINT: AvatarPaintParams = {
  enabled: false,
  brushSize: 18,
  brushColor: "#ec4899",
  brushOpacity: 0.65,
  activeZone: "face",
  strokes: [],
};

export const DEFAULT_SCULPT: AvatarSculptParams = {
  enabled: false,
  brushRadius: 0.025,
  brushStrength: 0.012,
  deltas: [],
};

export const DEFAULT_MAKEUP: AvatarMakeupParams = {
  eyeshadow: 20,
  eyeliner: 25,
  mascara: 30,
  blushIntensity: 35,
  lipstick: 40,
  lipColorIndex: 2,
  lipColorHex: "#e879a0",
  contour: 15,
  highlight: 20,
};

export const DEFAULT_EQUIPPED: AvatarEquippedItems = {
  hairId: null,
  topId: null,
  bottomId: null,
  shoesId: null,
  headwearId: null,
  accessoryId: null,
  fullOutfitId: null,
  makeupId: null,
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  style: "anime",
  body: {
    height: 168,
    weight: 58,
    shoulderWidth: 45,
    waist: 68,
    armLength: 60,
    armThickness: 60,
    legLength: 90,
    genderExpression: "female",
  },
  face: {
    faceShape: "oval",
    eyeSize: 58,
    eyeSpacing: 50,
    eyeTilt: 52,
    eyeHeight: 50,
    eyeDepth: 48,
    doubleEyelid: 62,
    eyeColorIndex: 1,
    eyeColorHex: "#4a6741",
    pupilSize: 50,
    browHeight: 52,
    browThickness: 45,
    browSpacing: 50,
    browTilt: 50,
    noseSize: 42,
    noseHeight: 50,
    noseWidth: 45,
    noseBridge: 50,
    noseTip: 48,
    lipThickness: 48,
    lipWidth: 52,
    mouthCorner: 55,
    philtrum: 50,
    jawWidth: 48,
    jawAngle: 50,
    chinLength: 50,
    chinPoint: 48,
    cheekbone: 52,
    forehead: 50,
    makeup: { ...DEFAULT_MAKEUP },
  },
  skin: {
    toneIndex: 2,
    brightness: 50,
    saturation: 50,
    freckles: false,
    blush: true,
    glow: false,
  },
  outfit: {
    preset: "casual",
    topColor: "#e8d4b8",
    bottomColor: "#475569",
    accentColor: "#c4a574",
    layers: { top: true, bottom: true, shoes: true, accessories: false, headwear: false },
  },
  hair: {
    style: 0,
    volume: 55,
    length: 50,
    colorIndex: 0,
    colorHex: "#1a1a1a",
    gradient: false,
    highlight: false,
  },
  effects: {
    motion: "idle",
    particle: "none",
    background: "space",
    animationPlaying: true,
    renderQuality: "studio",
    celShading: true,
  },
  view: {
    zoom: 1,
    rotation: 0,
    autoRotate: false,
  },
  equipped: { ...DEFAULT_EQUIPPED },
  paint: { ...DEFAULT_PAINT },
  sculpt: { ...DEFAULT_SCULPT },
};
