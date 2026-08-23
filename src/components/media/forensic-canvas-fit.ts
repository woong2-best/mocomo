export type ForensicPaintSize = {
  /** CSS layout pixels — what occupies space in the layout. */
  cssWidth: number;
  cssHeight: number;
  /** Canvas backing-store pixels — must match CSS pixels for OS screenshot alignment. */
  width: number;
  height: number;
  devicePixelRatio: number;
};

/** Forensic embed uses 1:1 backing/CSS pixels so OS screenshots match embed coordinates. */
export function getForensicDevicePixelRatio(): number {
  return 1;
}

const MIN_DISPLAY_LONG_EDGE = 480;
/** Smaller embeds cannot recover enough quadrant bits to pass client verification. */
export const MIN_FORENSIC_VERIFY_LONG_EDGE = 160;

export function isForensicDisplaySizeReady(
  computed: ForensicPaintSize,
  displayed: ForensicPaintSize
): boolean {
  const computedLong = Math.max(computed.cssWidth, computed.cssHeight);
  const displayedLong = Math.max(displayed.cssWidth, displayed.cssHeight);
  const minLong = Math.min(
    MIN_FORENSIC_VERIFY_LONG_EDGE,
    Math.max(96, Math.round(computedLong * 0.35))
  );
  if (displayedLong < minLong) return false;

  const computedArea = computed.cssWidth * computed.cssHeight;
  const displayedArea = displayed.cssWidth * displayed.cssHeight;
  if (computedArea > 0 && displayedArea / computedArea < 0.2) return false;

  return true;
}

function findContainBounds(wrap: HTMLElement): { maxW: number; maxH: number } {
  let maxW =
    typeof window !== "undefined" ? Math.min(window.innerWidth, 1920) : 1920;
  let maxH =
    typeof window !== "undefined" ? Math.min(window.innerHeight, 1080) : 1080;

  let el: HTMLElement | null = wrap.parentElement;
  for (let depth = 0; depth < 8 && el; depth += 1) {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (w >= 8) maxW = Math.min(maxW, w);
    if (h >= 8) maxH = Math.min(maxH, h);
    el = el.parentElement;
  }

  return {
    maxW: Math.max(8, maxW - 32),
    maxH: Math.max(8, maxH - 32),
  };
}

function fitIntrinsicSize(
  intrinsicWidth: number,
  intrinsicHeight: number,
  maxW: number,
  maxH: number,
  fit: "cover" | "contain"
): { cssWidth: number; cssHeight: number } {
  const scale =
    fit === "contain"
      ? Math.min(maxW / intrinsicWidth, maxH / intrinsicHeight, 1)
      : Math.max(maxW / intrinsicWidth, maxH / intrinsicHeight);
  let cssWidth = Math.max(8, Math.round(intrinsicWidth * scale));
  let cssHeight = Math.max(8, Math.round(intrinsicHeight * scale));

  const longEdge = Math.max(cssWidth, cssHeight);
  if (longEdge < MIN_DISPLAY_LONG_EDGE && longEdge > 0) {
    const boost = Math.min(
      MIN_DISPLAY_LONG_EDGE / longEdge,
      maxW / cssWidth,
      maxH / cssHeight
    );
    if (boost > 1.01) {
      cssWidth = Math.max(8, Math.round(cssWidth * boost));
      cssHeight = Math.max(8, Math.round(cssHeight * boost));
    }
  }

  return { cssWidth, cssHeight };
}

function readParentBox(wrap: HTMLElement): { cssWidth: number; cssHeight: number } | null {
  let cssWidth = wrap.clientWidth;
  let cssHeight = wrap.clientHeight;
  if (cssWidth >= 8 && cssHeight >= 8) {
    return { cssWidth, cssHeight };
  }

  cssWidth = wrap.offsetWidth;
  cssHeight = wrap.offsetHeight;
  if (cssWidth >= 8 && cssHeight >= 8) {
    return { cssWidth, cssHeight };
  }

  const parent = wrap.parentElement;
  if (parent) {
    cssWidth = parent.clientWidth;
    cssHeight = parent.clientHeight;
    if (cssWidth >= 8 && cssHeight >= 8) {
      return { cssWidth, cssHeight };
    }
  }

  return null;
}

export function resolveForensicPaintSize(
  wrap: HTMLElement,
  intrinsicWidth: number,
  intrinsicHeight: number,
  fit: "cover" | "contain" = "contain",
  options?: { fillParent?: boolean }
): ForensicPaintSize | null {
  if (options?.fillParent && fit === "cover") {
    const parentBox = readParentBox(wrap);
    if (parentBox) return toBackingStoreSize(parentBox.cssWidth, parentBox.cssHeight);
  }

  if (intrinsicWidth >= 8 && intrinsicHeight >= 8) {
    const { maxW, maxH } = findContainBounds(wrap);
    const fitted = fitIntrinsicSize(intrinsicWidth, intrinsicHeight, maxW, maxH, fit);
    return toBackingStoreSize(fitted.cssWidth, fitted.cssHeight);
  }

  return null;
}

function toBackingStoreSize(cssWidth: number, cssHeight: number): ForensicPaintSize {
  const devicePixelRatio = getForensicDevicePixelRatio();
  return {
    cssWidth,
    cssHeight,
    width: Math.max(8, Math.round(cssWidth * devicePixelRatio)),
    height: Math.max(8, Math.round(cssHeight * devicePixelRatio)),
    devicePixelRatio,
  };
}

/** On-screen box after layout — OS screenshots sample these CSS pixels. */
export function readDisplayedPaintSize(element: HTMLElement): ForensicPaintSize | null {
  const rect = element.getBoundingClientRect();
  const cssWidth = Math.max(8, Math.round(rect.width));
  const cssHeight = Math.max(8, Math.round(rect.height));
  if (rect.width < 4 || rect.height < 4) return null;
  return toBackingStoreSize(cssWidth, cssHeight);
}

/**
 * Apply computed size, then re-read the painted box so embed coordinates match
 * what exportPng() and OS capture actually sample (avoids max-h / DPR drift).
 */
export function alignPaintSizeToDisplay(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  computed: ForensicPaintSize,
  wrapMode: "fixed" | "fill" = "fixed"
): ForensicPaintSize | null {
  applyForensicWrapSize(wrap, computed, wrapMode);
  applyForensicCanvasSize(canvas, computed);

  const displayed = readDisplayedPaintSize(canvas);
  if (!displayed) return null;

  if (
    displayed.cssWidth !== computed.cssWidth ||
    displayed.cssHeight !== computed.cssHeight
  ) {
    applyForensicWrapSize(wrap, displayed, wrapMode);
    applyForensicCanvasSize(canvas, displayed);
  }

  return displayed;
}

/** Like alignPaintSizeToDisplay, but waits until layout is large enough to verify. */
export function alignPaintSizeToDisplayWhenReady(
  wrap: HTMLElement,
  canvas: HTMLCanvasElement,
  computed: ForensicPaintSize,
  wrapMode: "fixed" | "fill" = "fixed"
): ForensicPaintSize | null {
  const aligned = alignPaintSizeToDisplay(wrap, canvas, computed, wrapMode);
  if (!aligned) return null;
  if (!isForensicDisplaySizeReady(computed, aligned)) return null;
  return aligned;
}

/** Backing store must match on-screen CSS pixels; style size matches layout box. */
export function applyForensicCanvasSize(canvas: HTMLCanvasElement, size: ForensicPaintSize) {
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.style.width = `${size.cssWidth}px`;
  canvas.style.height = `${size.cssHeight}px`;
  canvas.style.maxWidth = "none";
  canvas.style.maxHeight = "none";
}

export function applyForensicWrapSize(
  wrap: HTMLElement,
  size: ForensicPaintSize,
  mode: "fixed" | "fill" = "fixed"
) {
  if (mode === "fill") {
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    return;
  }
  wrap.style.width = `${size.cssWidth}px`;
  wrap.style.height = `${size.cssHeight}px`;
}

export function drawSourceFit(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  width: number,
  height: number,
  fit: "cover" | "contain"
) {
  ctx.clearRect(0, 0, width, height);
  const scale =
    fit === "contain"
      ? Math.min(width / sourceWidth, height / sourceHeight)
      : Math.max(width / sourceWidth, height / sourceHeight);
  const dw = sourceWidth * scale;
  const dh = sourceHeight * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
}
