export type StudioCategoryOption = {
  id: string;
  group: string;
  label: string;
};

/** Stable ids: `groupSlug:optionSlug` */
export const CREATOR_STUDIO_CATEGORIES: StudioCategoryOption[] = [
  { id: "vtuber-3d:live2d", group: "VTuber & 3D", label: "Live2D" },
  { id: "vtuber-3d:avatar", group: "VTuber & 3D", label: "3D Avatar" },
  { id: "vtuber-3d:assets", group: "VTuber & 3D", label: "3D Assets" },
  { id: "streamer:overlay", group: "Streamer Assets", label: "Overlay" },
  { id: "streamer:emotes", group: "Streamer Assets", label: "Emotes" },
  { id: "streamer:logo", group: "Streamer Assets", label: "Logo" },
  { id: "illustration:character", group: "Illustration", label: "Character" },
  { id: "illustration:cover", group: "Illustration", label: "Cover" },
  { id: "illustration:design", group: "Illustration", label: "Design" },
  { id: "audio:mixing", group: "Audio & Voice", label: "Mixing" },
  { id: "audio:bgm", group: "Audio & Voice", label: "BGM" },
  { id: "audio:voice", group: "Audio & Voice", label: "Voice" },
  { id: "resources:bg-background", group: "Creator Resources", label: "3D Background" },
  { id: "resources:brushes", group: "Creator Resources", label: "Brushes" },
];

const VALID_IDS = new Set(CREATOR_STUDIO_CATEGORIES.map((item) => item.id));

export function isValidStudioCategoryId(id: string) {
  return VALID_IDS.has(id);
}

export function studioCategoryLabel(id: string) {
  const row = CREATOR_STUDIO_CATEGORIES.find((item) => item.id === id);
  if (!row) return id;
  return `${row.group} · ${row.label}`;
}

export const DEFAULT_STUDIO_CATEGORY_ID = "illustration:character";
