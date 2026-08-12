/**
 * Cross-browser video fullscreen helpers.
 * iOS Safari does not support Element.requestFullscreen on containers —
 * only HTMLVideoElement.webkitEnterFullscreen().
 */

type WebkitVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
  webkitExitFullscreen?: () => void;
  webkitDisplayingFullscreen?: boolean;
  webkitSupportsFullscreen?: boolean;
};

type WebkitDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type WebkitElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function isVideoFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null
): boolean {
  if (typeof document === "undefined") return false;
  if (container && document.fullscreenElement === container) return true;
  const doc = document as WebkitDocument;
  if (container && doc.webkitFullscreenElement === container) return true;
  const v = video as WebkitVideo | null;
  if (v?.webkitDisplayingFullscreen) return true;
  return false;
}

export async function enterVideoFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null
): Promise<boolean> {
  if (!container && !video) return false;

  try {
    if (container?.requestFullscreen) {
      await container.requestFullscreen();
      return true;
    }
    const webkitEl = container as WebkitElement | null;
    if (webkitEl?.webkitRequestFullscreen) {
      await webkitEl.webkitRequestFullscreen();
      return true;
    }
  } catch {
    /* fall through to iOS video fullscreen */
  }

  const v = video as WebkitVideo | null;
  if (v?.webkitEnterFullscreen) {
    try {
      v.webkitEnterFullscreen();
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function exitVideoFullscreen(
  video: HTMLVideoElement | null
): Promise<void> {
  if (typeof document === "undefined") return;

  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
      return;
    } catch {
      /* continue */
    }
  }

  const doc = document as WebkitDocument;
  if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
    try {
      await doc.webkitExitFullscreen();
      return;
    } catch {
      /* continue */
    }
  }

  const v = video as WebkitVideo | null;
  if (v?.webkitDisplayingFullscreen && v.webkitExitFullscreen) {
    try {
      v.webkitExitFullscreen();
    } catch {
      /* ignore */
    }
  }
}

export async function toggleVideoFullscreen(
  container: HTMLElement | null,
  video: HTMLVideoElement | null
): Promise<boolean> {
  if (isVideoFullscreen(container, video)) {
    await exitVideoFullscreen(video);
    return false;
  }
  return enterVideoFullscreen(container, video);
}

/** Bind iOS webkit fullscreen events; returns cleanup. */
export function bindVideoFullscreenEvents(
  video: HTMLVideoElement | null,
  onChange: () => void
): () => void {
  if (!video) return () => undefined;
  video.addEventListener("webkitbeginfullscreen", onChange);
  video.addEventListener("webkitendfullscreen", onChange);
  return () => {
    video.removeEventListener("webkitbeginfullscreen", onChange);
    video.removeEventListener("webkitendfullscreen", onChange);
  };
}
