import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

/** 2D 방송 아바타 캔버스 권장 크기 */
export const AVATAR_2D_SIZE = 1024;

export type Flat2dAvatarSource = "draw" | "upload";

export type Flat2dAvatarMeta = {
  version: 1;
  width: number;
  height: number;
  source: Flat2dAvatarSource;
  /** blob URL or https */
  imageUrl: string;
  cloudUrl?: string;
  registeredAt: string;
};

export type Avatar2dDrawTool =
  | "pencil"
  | "pen"
  | "gpen"
  | "airbrush"
  | "eraser"
  | "fill"
  | "eyedropper";

export const AVATAR_2D_DRAW_TOOLS: { id: Avatar2dDrawTool; label: string }[] = [
  { id: "pencil", label: t("lib.webtoon-studio.syu6s") },
  { id: "pen", label: t("lib.webtoon-studio.s15ss") },
  { id: "gpen", label: t("lib.webtoon-studio.s17hx") },
  { id: "airbrush", label: t("lib.webtoon-studio.shu474o") },
  { id: "eraser", label: t("lib.webtoon-studio.suika4") },
  { id: "fill", label: t("lib.webtoon-studio.suvu84") },
  { id: "eyedropper", label: t("lib.webtoon-studio.spfsrzk") },
];
