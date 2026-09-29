/** Ad mixer offset for paginated feed — must reset on full feed refresh (pull, new post). */
let feedPostOffset = 0;

export function getFeedPostOffset() {
  return feedPostOffset;
}

export function addFeedPostOffset(count: number) {
  feedPostOffset += count;
}

export function resetFeedPostOffset() {
  feedPostOffset = 0;
}
