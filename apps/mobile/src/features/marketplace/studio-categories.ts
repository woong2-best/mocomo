export type StudioCategoryOption = {
  id: string;
  group: string;
  label: string;
};

/** Keep ids in sync with `src/lib/creator-studio-categories.ts` */
export const STUDIO_CATEGORY_OPTIONS: StudioCategoryOption[] = [
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

export const DEFAULT_STUDIO_CATEGORY_ID = "illustration:character";

export function studioCategoryDisplay(id: string) {
  const row = STUDIO_CATEGORY_OPTIONS.find((item) => item.id === id);
  if (!row) return "";
  return `${row.group} · ${row.label}`;
}

export function studioCategoryGroups() {
  const groups = new Map<string, StudioCategoryOption[]>();
  for (const item of STUDIO_CATEGORY_OPTIONS) {
    const list = groups.get(item.group) ?? [];
    list.push(item);
    groups.set(item.group, list);
  }
  return [...groups.entries()];
}
