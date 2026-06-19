export type AptStudioInventoryItem = {
  studioAssetId: string;
  name: string;
  glbUrl: string;
  thumbnailUrl: string | null;
  category: string;
};

export type StudioDecorTool = AptStudioInventoryItem;
