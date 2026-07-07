export const EDITOR_PROJECT_VERSION = 1 as const;

export type EditorLayerType = "background" | "image";

export type LayerTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

export type ImageLayerData = {
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  flipX: boolean;
  flipY: boolean;
};

export type EditorLayer = {
  id: string;
  name: string;
  type: EditorLayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  transform: LayerTransform;
  data: ImageLayerData;
};

export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EditorProject = {
  version: typeof EDITOR_PROJECT_VERSION;
  width: number;
  height: number;
  layers: EditorLayer[];
  activeLayerId: string | null;
  crop: CropRect;
};

export type CropAspectPreset = {
  id: string;
  label: string;
  aspect?: number;
};
