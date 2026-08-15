/** Whether to show the sensitive-content warning overlay before media is revealed. */
export function shouldGateSensitiveContent(
  isNsfw: boolean,
  isOwner: boolean,
  viewerShowNsfw = false
): boolean {
  return isNsfw && !isOwner && !viewerShowNsfw;
}
