import { canViewNsfwContent, type NsfwViewer } from "@/lib/nsfw-viewer-access";

/** Whether to show the sensitive-content warning overlay before media is revealed. */
export function shouldGateSensitiveContent(
  isNsfw: boolean,
  isOwner: boolean,
  viewerShowNsfw = false,
  viewer?: NsfwViewer | null
): boolean {
  if (!isNsfw || isOwner) return false;
  if (viewer !== undefined && !canViewNsfwContent(viewer)) return true;
  return !viewerShowNsfw;
}

/** True when viewer is ineligible — overlay must not offer a reveal action. */
export function isSensitiveContentHardBlocked(
  isNsfw: boolean,
  isOwner: boolean,
  viewer?: NsfwViewer | null
): boolean {
  return isNsfw && !isOwner && viewer !== undefined && !canViewNsfwContent(viewer);
}
