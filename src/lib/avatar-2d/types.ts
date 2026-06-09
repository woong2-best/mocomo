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
  { id: "pencil", label: "연필" },
  { id: "pen", label: "펜" },
  { id: "gpen", label: "G펜" },
  { id: "airbrush", label: "에어브러시" },
  { id: "eraser", label: "지우개" },
  { id: "fill", label: "채우기" },
  { id: "eyedropper", label: "스포이드" },
];
